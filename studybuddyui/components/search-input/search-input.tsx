import { useState } from "react";
import type { ReactNode } from "react";

type InputVisualState =
  | "default"
  | "hover"
  | "focus"
  | "filled"
  | "disabled"
  | "error";

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

function staticBoxClasses(state: InputVisualState): string {
  switch (state) {
    case "hover":
      return "border-[#C9CAD8] bg-[#FAFAFC]";
    case "focus":
      return "border-[#5B5BD6] ring-2 ring-[#5B5BD6]/20";
    case "filled":
      return "border-[#EEF0F5]";
    case "disabled":
      return "cursor-not-allowed border-[#EEF0F5] bg-[#F8F8FB] opacity-40";
    case "error":
      return "border-[#F53F3F] ring-2 ring-[#F53F3F]/15";
    default:
      return "border-[#EEF0F5]";
  }
}

function SearchInputBox({
  state = "default",
  value = "",
  interactive = false,
  onValueChange,
}: {
  state?: InputVisualState;
  value?: string;
  interactive?: boolean;
  onValueChange?: (next: string) => void;
}) {
  const hasValue = value.length > 0;
  const showErrorLine = state === "error";
  const boxClasses = interactive
    ? `cursor-text border-[#EEF0F5] hover:border-[#C9CAD8] focus-within:border-[#5B5BD6] focus-within:ring-2 focus-within:ring-[#5B5BD6]/20`
    : staticBoxClasses(state);
  return (
    <div className="w-80">
      <div
        className={`group flex h-9 items-center gap-2 rounded-lg border bg-white px-3 transition-shadow ${boxClasses}`}
      >
        <span className={state === "error" ? "text-[#F53F3F]" : "text-[#9A9AB0]"}>
          <SearchIcon />
        </span>
        <input
          type="text"
          value={value}
          readOnly={!interactive}
          disabled={state === "disabled"}
          onChange={
            interactive && onValueChange
              ? (event) => onValueChange(event.target.value)
              : undefined
          }
          placeholder="搜索关键词"
          aria-label="搜索"
          className={`h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9A9AB0] ${
            state === "disabled" ? "cursor-not-allowed" : ""
          } ${state === "error" ? "text-[#1A1A2E]" : "text-[#1A1A2E]"}`}
        />
        {interactive && hasValue ? (
          <button
            type="button"
            aria-label="清空"
            onClick={() => onValueChange?.("")}
            className="cursor-pointer rounded p-0.5 text-[#9A9AB0] opacity-0 transition-opacity hover:bg-[#F3F2FB] hover:text-[#1A1A2E] focus:opacity-100 group-hover:opacity-100"
          >
            <ClearIcon />
          </button>
        ) : null}
        {!interactive && state === "filled" && hasValue ? (
          <span className="text-[#9A9AB0]">
            <ClearIcon />
          </span>
        ) : null}
      </div>
      {showErrorLine ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-[#F53F3F]">
          <WarnIcon />
          请输入有效关键词后重试
        </p>
      ) : null}
    </div>
  );
}

function ShowcaseItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {children}
      <span className="text-xs text-[#9A9AB0]">{label}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="mb-4 text-sm font-semibold text-[#1A1A2E]">{children}</h3>
  );
}

function ClearButton({
  state = "default",
}: {
  state?: "default" | "hover" | "active";
}) {
  const classes: Record<string, string> = {
    default: "text-[#9A9AB0]",
    hover: "bg-[#F3F2FB] text-[#1A1A2E]",
    active: "scale-95 bg-[#E9E8F7] text-[#1A1A2E]",
  };
  return (
    <span
      aria-hidden="true"
      className={`rounded p-0.5 ${classes[state]}`}
    >
      <ClearIcon />
    </span>
  );
}

export default function SearchInput() {
  const [value, setValue] = useState("");
  const states: { label: string; state: InputVisualState; value: string }[] = [
    { label: "默认", state: "default", value: "" },
    { label: "悬浮", state: "hover", value: "" },
    { label: "聚焦", state: "focus", value: "" },
    { label: "有内容", state: "filled", value: "演示关键词" },
    { label: "禁用", state: "disabled", value: "演示关键词" },
    { label: "错误", state: "error", value: "无效输入" },
  ];
  return (
    <div className="flex flex-col gap-8 bg-white p-8">
      <section>
        <SectionTitle>交互演示</SectionTitle>
        <SearchInputBox interactive value={value} onValueChange={setValue} />
      </section>

      <section>
        <SectionTitle>输入框状态陈列</SectionTitle>
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          {states.map((item) => (
            <ShowcaseItem key={item.label} label={item.label}>
              <SearchInputBox state={item.state} value={item.value} />
            </ShowcaseItem>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>清空按钮状态陈列(仅悬浮/有内容时显示)</SectionTitle>
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          <ShowcaseItem label="默认">
            <ClearButton />
          </ShowcaseItem>
          <ShowcaseItem label="悬浮">
            <ClearButton state="hover" />
          </ShowcaseItem>
          <ShowcaseItem label="按压">
            <ClearButton state="active" />
          </ShowcaseItem>
        </div>
      </section>
    </div>
  );
}
