---
title: "Design: AXY-25 陪伴闲聊伙伴 · 测试接缝"
description: AXY-25 的测试接缝(TDD red 阶段的直接输入)
sidebar_position: 4
---

# Design: AXY-25 陪伴闲聊伙伴 · 测试接缝

> 本文件为 design 的拆出节，批准状态以 [design.md](design) 头部表为准，不另设状态列。

## 测试接缝

测试纪律：agent-service 与 LLM 调用一律 mock（既有 E2E 纪律），python 侧服务不在 Node 测试进程内启动。

| 测试层 | 接缝 | 断言要点 | 关联 R |
| ------ | ---- | -------- | ------ |
| 单元 | `agentEventToUIMessageChunk`（src/agent/transform.ts） | TEXT_BLOCK_DELTA→text-delta 且带 assistantId；REPLY_END(completed)→finish；REPLY_END(error)→error chunk 携带 E-02 文案；未知事件类型→null 不抛错 | R1、R6 |
| 单元 | `sendMessageSchema`（modules/chat/validators.ts，F-01） | 1 字与 2000 字通过；0 字与 2001 字拒绝；边界取值逐个断言 | R7 |
| 单元 | `saveUserMessage`（modules/chat/service.ts） | 同 id 二次保存不产生第二行（ON CONFLICT 去重，AC6 重试语义）；新 id 正常落库 | R6 |
| 单元 | `getRecentMessages`（modules/chat/queries.ts） | 返回按 createdAt 升序的 UIMessage[]（id/role/text 映射正确）；limit 生效 | R3 |
| 集成 | `POST /api/chat`（mock agent-service 客户端） | 未登录 401；trigger = submit-message 落库 user 行且响应头含 x-vercel-ai-ui-message-stream: v1 与 x-accel-buffering: no；trigger = regenerate-message 不重复落库；流序列 start→text-delta…→finish→[DONE] | R1、R6、R7 |
| 集成 | `runCompanionTurn`（mock openSessionStream 事件序列） | 正常完成：assistant 行落库且 writer 收到 finish；REPLY_END(error)：无落库且 writer 收到 E-02 error chunk；agent-service 网络错：同失败路径 | R1、R6 |
| E2E | 工作台伙伴面板主旅程（agent-service mock） | 发消息→回复逐字出现且为短句；新用户空态正常迎接（R5）；断言工作台既有功能不受影响（边界 4） | R1、R5 |
| E2E | 失败重试旅程（agent-service mock 首次失败） | 失败时已发消息保留、E-02 与重试入口呈现；点重试后重新生成成功 | R6 |
| 人工抽检 | 隔天回访对话抽测（≥ 10 组跨天会话） | 无需提醒即主动引用旧事（AC2）；记忆不张冠李戴（Q3 同源） | R2 |
| 人工抽检 | 吐槽场景对话抽测（≥ 10 组） | 先接情绪再鼓励、无主动建议（AC4）；口语短句、无成段长文（AC1/Q4 同源） | R4 |
| 人工抽检 | 换设备登录抽测（两浏览器环境） | 历史完整呈现、话题延续（AC3） | R3 |
