/**
 * chat-panel：聊天伙伴面板（经典双气泡式）——用户右对齐实心气泡，伙伴左对齐浅底气泡；全状态陈列 + 交互演示。。
 * 用户右对齐实心气泡 / 伙伴左对齐浅底气泡；全状态陈列 + 交互演示。
 * 自包含条目：仅 Tailwind 类，不引用工作区其他条目。
 */
import { useRef, useState } from "react";

type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  failed?: boolean;
};

const BRAND = "#5B5BD6";

/** 输入区：textarea + 发送钮 + 底部提示（字数计数 / E-01 占位）。 */
function ChatInput({
  disabled,
  onError,
  onSend,
}: {
  disabled?: boolean;
  onError?: boolean;
  onSend?: (text: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="border-t border-[#EEF0F5] p-3">
      <div className="flex items-end gap-2">
        <textarea
          rows={2}
          maxLength={2000}
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          placeholder={disabled ? "伙伴回复中…" : "输入消息"}
          className="min-w-0 flex-1 resize-none rounded-lg border border-[#D9D9E3] px-4 py-2 text-sm leading-6 outline-none transition-colors duration-150 placeholder:text-[#9A9AB0] focus:border-[#5B5BD6] focus:ring-2 focus:ring-[#5B5BD6]/20 disabled:bg-[#F7F7FA] disabled:cursor-not-allowed"
        />
        <button
          type="button"
          disabled={disabled || value.length === 0}
          onClick={() => {
            onSend?.(value);
            setValue("");
          }}
          className={`h-10 shrink-0 rounded-lg px-4 text-sm font-medium text-white transition-all duration-150 ${
            disabled || value.length === 0
              ? "cursor-not-allowed bg-[#5B5BD6] opacity-40"
              : "bg-[#5B5BD6] hover:bg-[#4E4EC4] active:scale-95 active:bg-[#4646B4]"
          }`}
        >
          发送
        </button>
      </div>
      <div className="mt-2 flex h-4 items-center justify-between text-xs">
        <span
          className={
            onError ? "text-[#F53F3F]" : "text-transparent"
          }
        >
          {onError ? "最多 2000 字，精简一点再发吧" : "."}
        </span>
        <span className="text-[#9A9AB0]">{value.length} / 2000</span>
      </div>
    </div>
  );
}

/** 双气泡：用户实心右对齐，伙伴浅底左对齐；失败态替换为错误行 + 重试按钮。 */
function Bubble({ msg, onRetry }: { msg: Msg; onRetry?: () => void }) {
  const long = msg.text.length > 60;
  if (msg.failed) {
    return (
      <div className="flex justify-start">
        <div className="rounded-lg border border-[#F53F3F]/40 bg-[#F53F3F]/5 px-4 py-2 text-sm text-[#F53F3F]">
          <div className="flex items-center gap-2">
            <span aria-hidden>⚠</span>
            <span>这条没送达，点一下重试</span>
            <button
              type="button"
              onClick={onRetry}
              className="ml-1 rounded-md border border-[#F53F3F]/50 px-2 py-0.5 text-xs font-medium text-[#F53F3F] transition-colors duration-150 hover:bg-[#F53F3F]/10 active:scale-95"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] rounded-xl px-4 py-2 text-sm leading-6 transition-colors duration-150 ${
          isUser
            ? "rounded-br-sm bg-[#5B5BD6] text-white"
            : "rounded-bl-sm bg-[#F3F4F6] text-[#1A1A2E]"
        } ${long ? "whitespace-pre-wrap break-words" : ""}`}
      >
        {msg.text}
      </div>
    </div>
  );
}

/** 面板实例：消息列表 + 输入区；enter 动画仅对新消息生效。 */
function Panel({
  messages,
  inputDisabled,
  inputError,
  onSend,
  onRetry,
  streamingId,
}: {
  messages: Msg[];
  inputDisabled?: boolean;
  inputError?: boolean;
  onSend?: (text: string) => void;
  onRetry?: () => void;
  streamingId?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  return (
    <div className="flex h-[440px] w-full max-w-[560px] flex-col overflow-hidden rounded-xl border border-[#EEF0F5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div
        ref={listRef}
        className="flex flex-1 flex-col gap-4 overflow-y-auto p-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-[#9A9AB0]">
            <span className="text-2xl" aria-hidden>
              💬
            </span>
            <span>嗨，我是你的学习伙伴，聊点什么？</span>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className="animate-in-msg"
            >
              <Bubble msg={m} onRetry={onRetry} />
              {m.id === streamingId && (
                <span
                  aria-hidden
                  className="ml-1 inline-block h-4 w-2 animate-pulse bg-[#5B5BD6] align-middle"
                />
              )}
            </div>
          ))
        )}
      </div>
      <ChatInput disabled={inputDisabled} onError={inputError} onSend={onSend} />
    </div>
  );
}

/** 交互演示：真实可发送、流式追加、可模拟失败与重试。 */
function InteractiveDemo() {
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    { id: "s1", role: "assistant", text: "嗨，我是你的学习伙伴，今天感觉怎么样？" },
    { id: "s2", role: "user", text: "刚刷完一套题，有点累。" },
    {
      id: "s3",
      role: "assistant",
      text: "辛苦啦！连续刷题很耗神，先歇口气，喝口水再继续？",
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [streamId, setStreamId] = useState<string | undefined>();

  const stream = (id: string, text: string) => {
    setBusy(true);
    setStreamId(id);
    let i = 0;
    timer.current = setInterval(() => {
      i += 1;
      const next = text.slice(0, i);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, text: next } : m)),
      );
      if (i >= text.length) {
        if (timer.current) clearInterval(timer.current);
        setBusy(false);
        setStreamId(undefined);
      }
    }, 40);
  };

  const handleSend = (text: string) => {
    const userMsg: Msg = { id: `u${++seq.current}`, role: "user", text };
    const replyId = `a${++seq.current}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: replyId, role: "assistant", text: "" },
    ]);
    stream(replyId, "听上去今天学得很扎实，休息一下也是学习的一部分呀。");
  };

  return (
    <Panel
      messages={messages}
      inputDisabled={busy}
      onSend={handleSend}
      streamingId={streamId}
    />
  );
}

const STATES: { label: string; node: React.ReactNode }[] = [
  { label: "交互演示（可输入 / 发送 / 流式）", node: <InteractiveDemo /> },
  {
    label: "生成中 · 流式（发送钮置灰，光标闪烁）",
    node: (
      <Panel
        inputDisabled
        streamingId="s3"
        messages={[
          { id: "s1", role: "user", text: "帮我看看今天怎么安排？" },
          {
            id: "s3",
            role: "assistant",
            text: "好呀，先看看你今天的任务清单，我们一件一件",
          },
        ]}
      />
    ),
  },
  {
    label: "失败 · 重试（E-02 呈现 + 重试按钮）",
    node: (
      <Panel
        messages={[
          { id: "s1", role: "user", text: "在吗？" },
          { id: "s2", role: "assistant", text: "", failed: true },
        ]}
      />
    ),
  },
  {
    label: "空态 · 迎接（无历史，伙伴先开口）",
    node: (
      <Panel
        messages={[
          { id: "s1", role: "assistant", text: "嗨，我是你的学习伙伴，聊点什么？" },
        ]}
      />
    ),
  },
  {
    label: "超长文本（自动换行，气泡宽度上限 70%）",
    node: (
      <Panel
        messages={[
          {
            id: "s1",
            role: "assistant",
            text: "这是一条特别长的消息示例，用来验证文本超长时的自动换行与气泡宽度上限处理：连续不断的文字内容会在到达气泡最大宽度后自然折行，保持阅读节奏不溢出容器，也不产生横向滚动。",
          },
        ]}
      />
    ),
  },
];

export default function ChatPanel() {
  return (
    <div className="flex flex-col items-center gap-10 bg-white p-6">
      <style>{`
        @keyframes msg-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in-msg { animation: msg-in 250ms ease-out; }
        @media (prefers-reduced-motion: reduce) { .animate-in-msg { animation: none; } }
      `}</style>
      <p className="text-sm text-[#9A9AB0]">
        聊天伙伴面板（双气泡式）—— 以下为全状态陈列
      </p>
      {STATES.map((s) => (
        <section key={s.label} className="flex w-full max-w-[620px] flex-col gap-3">
          <h3 className="text-sm font-medium text-[#1A1A2E]">{s.label}</h3>
          {s.node}
        </section>
      ))}
      <section className="flex w-full max-w-[620px] flex-col gap-3">
        <h3 className="text-sm font-medium text-[#1A1A2E]">交互态标注（静态呈现）</h3>
        <div className="flex items-center gap-6 rounded-xl border border-[#EEF0F5] p-4">
          <div className="flex flex-col items-center gap-1">
            <span className="h-10 rounded-lg px-4 text-sm font-medium leading-10 text-white" style={{ background: BRAND }}>
              发送
            </span>
            <span className="text-xs text-[#9A9AB0]">默认</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="h-10 rounded-lg px-4 text-sm font-medium leading-10 text-white" style={{ background: "#4E4EC4" }}>
              发送
            </span>
            <span className="text-xs text-[#9A9AB0]">Hover（加深）</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="h-10 scale-95 rounded-lg px-4 text-sm font-medium leading-10 text-white" style={{ background: "#4646B4" }}>
              发送
            </span>
            <span className="text-xs text-[#9A9AB0]">Active（按压）</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="h-10 cursor-not-allowed rounded-lg px-4 text-sm font-medium leading-10 text-white opacity-40" style={{ background: BRAND }}>
              发送
            </span>
            <span className="text-xs text-[#9A9AB0]">Disabled（0.4）</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="block w-56 rounded-lg border border-[#5B5BD6] px-3 py-1.5 text-xs text-[#9A9AB0] ring-2 ring-[#5B5BD6]/20">
              聚焦态（边框高亮 + ring）
            </span>
            <span className="text-xs text-[#9A9AB0]">输入框 Focus</span>
          </div>
        </div>
      </section>
    </div>
  );
}
