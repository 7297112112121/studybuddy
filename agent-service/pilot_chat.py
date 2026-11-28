"""AI 操控客户端页面试点服务，验证 park/resume 闭环与 SSE 帧流。

会话态为进程内存字典（storage 组装形态待裁决，不入试点）；风险：进程重启
即丢会话，仅限试点验证用。设计见 docs/dev/pilot-agent-chat/试点架构设计.md。
"""

import asyncio
import json
import os
from collections.abc import AsyncGenerator, AsyncIterator
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from agentscope.agent import Agent, ReActConfig
from agentscope.credential import DeepSeekCredential
from agentscope.event import ExternalExecutionResultEvent
from agentscope.message import ToolResultBlock, ToolResultState, UserMsg
from agentscope.model import DeepSeekChatModel
from agentscope.permission import PermissionBehavior, PermissionDecision
from agentscope.tool import FunctionTool, ToolBase, Toolkit

ROUTE_WHITELIST = ["/", "/workbench", "/calendar"]
FORM_WHITELIST = ["calendar-entry"]

HEARTBEAT_INTERVAL_SECONDS = 30


class ClientActionTool(ToolBase):
    """客户端执行工具的统一声明模板（无 __call__，仅声明契约）。

    权限恒放行：执行发生在用户会话内的前端，执行本身即用户行为，
    与框架内置 AskUser 同理，云端再确认一次没有意义。
    """

    is_external_tool = True
    # ToolBase 对这两个属性只有注解没有默认值，子类不设会在 Acting 阶段报 AttributeError
    is_concurrency_safe = True
    is_read_only = False

    async def check_permissions(
        self,
        tool_input: dict[str, Any],
        context: Any,
    ) -> PermissionDecision:
        return PermissionDecision(
            behavior=PermissionBehavior.ALLOW,
            message="执行发生在用户侧前端，无需云端确认。",
        )


class NavigateTool(ClientActionTool):
    """跳转客户端页面，前端以路由跳转执行。"""

    name = "navigate"
    description = (
        "跳转到应用内页面。destination 只能是路由白名单内的路径，"
        "白名单外的请求会被前端拒绝并回传失败。"
    )
    input_schema = {
        "type": "object",
        "properties": {
            "destination": {
                "type": "string",
                "enum": ROUTE_WHITELIST,
                "description": "目标路由，仅限白名单枚举",
            }
        },
        "required": ["destination"],
    }


class ReadPageStateTool(ClientActionTool):
    """读取客户端页面状态摘要，前端按白名单 store 摘要执行。"""

    name = "read_page_state"
    description = (
        "读取用户当前页面的状态摘要（当前路由、页域关键状态），"
        "不返回原始 DOM 或任意存储内容。"
    )
    input_schema = {"type": "object", "properties": {}}
    is_read_only = True


class SubmitFormTool(ClientActionTool):
    """提交客户端表单，前端经既有 forms 写链执行，校验内建不绕过。"""

    name = "submit_form"
    description = (
        "代用户提交应用内表单。form_id 只能是表单白名单内的标识，"
        "values 字段以各表单定义为准，校验失败会回传 fieldErrors。"
    )
    input_schema = {
        "type": "object",
        "properties": {
            "form_id": {
                "type": "string",
                "enum": FORM_WHITELIST,
                "description": "表单标识，仅限白名单枚举",
            },
            "values": {
                "type": "object",
                "description": "表单字段值",
                "additionalProperties": True,
            },
        },
        "required": ["form_id", "values"],
    }


async def get_study_stats() -> str:
    """查询当前用户的学习统计（连续天数、本周条目数、今日完成数）。"""
    # stub：正式形态经 adapters 走 Next 内网 API（查询类工具服务端执行的落点）
    return json.dumps(
        {"streakDays": 12, "weekEntries": 8, "completedToday": 3},
        ensure_ascii=False,
    )


SYSTEM_PROMPT = (
    "你是内嵌在学习陪伴 Web 应用里的助手。你可以查询学习统计，"
    "也可以通过工具操作用户当前页面：跳转页面、读取页面状态、代用户提交表单。"
    "操作页面前先用一句话说明你要做什么；失败或被拒绝时如实告知用户。"
    "用中文交流。"
)

SESSIONS: dict[str, Agent] = {}


def get_agent(session_id: str) -> Agent:
    """按会话取 Agent，会话内对话记忆由 Agent 自身状态承载。"""
    if session_id not in SESSIONS:
        model = DeepSeekChatModel(
            credential=DeepSeekCredential(
                api_key=os.environ["DEEPSEEK_API_KEY"],
            ),
            model=os.environ.get("DEEPSEEK_MODEL", "deepseek-chat"),
        )
        SESSIONS[session_id] = Agent(
            name="studybuddy",
            system_prompt=SYSTEM_PROMPT,
            model=model,
            toolkit=Toolkit(
                tools=[
                    FunctionTool(
                        get_study_stats,
                        is_read_only=True,
                        permission=PermissionDecision(
                            behavior=PermissionBehavior.ALLOW,
                            message="只读统计查询，无需确认。",
                        ),
                    ),
                    NavigateTool(),
                    ReadPageStateTool(),
                    SubmitFormTool(),
                ],
            ),
            react_config=ReActConfig(max_iters=10),
        )
    return SESSIONS[session_id]


async def sse_frames(events: AsyncIterator[Any]) -> AsyncGenerator[str, None]:
    """把事件流转成 SSE 帧（data: {json}\n\n），间隔注释帧心跳防代理缓冲。

    流结束且未收到 REPLY_END 帧即回复停靠（park），等待外部执行回传恢复，
    不能把每个流结束都当成回复完成。
    """
    queue: asyncio.Queue = asyncio.Queue()

    async def pump() -> None:
        try:
            async for event in events:
                await queue.put(event)
            await queue.put(None)
        except BaseException as error:
            await queue.put(error)

    pump_task = asyncio.create_task(pump())
    try:
        while True:
            get_task = asyncio.create_task(queue.get())
            done, _ = await asyncio.wait(
                {get_task}, timeout=HEARTBEAT_INTERVAL_SECONDS
            )
            if not done:
                get_task.cancel()
                yield ": heartbeat\n\n"
                continue
            event = get_task.result()
            if event is None:
                break
            if isinstance(event, BaseException):
                raise event
            payload = event.model_dump(mode="json")
            yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
    finally:
        pump_task.cancel()


def stream_response(agent: Agent, inputs: Any) -> StreamingResponse:
    return StreamingResponse(
        sse_frames(agent.reply_stream(inputs)),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


class ChatRequest(BaseModel):
    session_id: str = Field(min_length=1, alias="sessionId")
    message: str = Field(min_length=1)


class ExternalResultItem(BaseModel):
    tool_call_id: str = Field(alias="toolCallId")
    tool: str
    state: Literal["output-available", "output-error"]
    output: Any = None
    error_text: str | None = Field(default=None, alias="errorText")


class ExternalResultRequest(BaseModel):
    session_id: str = Field(min_length=1, alias="sessionId")
    reply_id: str = Field(min_length=1, alias="replyId")
    results: list[ExternalResultItem]


def to_tool_result_block(item: ExternalResultItem) -> ToolResultBlock:
    """回传项映射为工具结果块，失败通道以 error 态原样转述给模型。"""
    if item.state == "output-error":
        output = item.error_text or "external execution failed"
        state = ToolResultState.ERROR
    else:
        output = (
            item.output
            if isinstance(item.output, str)
            else json.dumps(item.output, ensure_ascii=False)
        )
        state = ToolResultState.SUCCESS
    return ToolResultBlock(
        id=item.tool_call_id,
        name=item.tool,
        output=output,
        metadata={},
        state=state,
    )


app = FastAPI(title="studybuddy-pilot-chat")


@app.get("/health")
async def health() -> dict[str, Any]:
    return {"status": "ok", "sessions": len(SESSIONS)}


@app.post("/chat")
async def chat(request: ChatRequest) -> StreamingResponse:
    agent = get_agent(request.session_id)
    return stream_response(agent, UserMsg(name="user", content=request.message))


@app.post("/chat/external-result")
async def external_result(request: ExternalResultRequest) -> StreamingResponse:
    """外部执行结果回传并恢复推理；续流为独立 SSE，Next 映射层后续归并。"""
    agent = SESSIONS.get(request.session_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="unknown session")
    event = ExternalExecutionResultEvent(
        reply_id=request.reply_id,
        execution_results=[
            to_tool_result_block(item) for item in request.results
        ],
    )
    return stream_response(agent, event)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
