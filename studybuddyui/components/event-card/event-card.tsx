import type { ReactNode } from "react";

type CardStatus = "default" | "ongoing" | "done";

function StatusBadge({ status }: { status: CardStatus }) {
  if (status === "default") return null;
  const classes =
    status === "ongoing"
      ? "bg-[#F0EDFC] text-[#5B5BD6]"
      : "bg-[#F4F4F8] text-[#9A9AB0]";
  return (
    <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>
      {status === "ongoing" ? "进行中" : "已结束"}
    </span>
  );
}

function ClockIcon() {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-4 w-4 animate-spin"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-9-9" />
    </svg>
  );
}

function EventCardItem({
  status = "default",
  title = "日程事件标题占位，可两行显示",
  interactive = false,
  truncated = false,
}: {
  status?: CardStatus;
  title?: string;
  interactive?: boolean;
  truncated?: boolean;
}) {
  const barColor =
    status === "ongoing"
      ? "bg-[#5B5BD6]"
      : status === "done"
        ? "bg-[#D5D6E2]"
        : "bg-[#5B5BD6]";
  const contentMuted = status === "done";
  const hoverClasses = interactive
    ? "cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-shadow transition-transform hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
    : "shadow-[0_1px_2px_rgba(0,0,0,0.05)]";
  return (
    <article
      className={`relative w-80 overflow-hidden rounded-xl border border-[#EEF0F5] bg-white p-6 pl-7 ${hoverClasses}`}
    >
      <span
        aria-hidden="true"
        className={`absolute left-0 top-0 h-full w-1 ${barColor}`}
      />
      <div className="flex items-center justify-between">
        <time
          className={`text-sm ${contentMuted ? "text-[#C2C3D2]" : "text-[#9A9AB0]"}`}
        >
          10:00 – 12:00
        </time>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-[#F3F2FB] px-2.5 py-1 text-xs font-medium text-[#5B5BD6]`}
        >
          <ClockIcon />
          30 分钟
        </span>
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <h4
          className={`font-semibold ${truncated ? "line-clamp-2" : ""} text-base leading-6 ${
            contentMuted ? "text-[#9A9AB0]" : "text-[#1A1A2E]"
          }`}
        >
          {title}
        </h4>
        <StatusBadge status={status} />
      </div>
      <div className="mt-6 flex items-center gap-3">
        <SecondaryButton interactive={interactive} />
        <PrimaryButton interactive={interactive} />
      </div>
    </article>
  );
}

function PrimaryButton({
  interactive = false,
  state = "default",
  label = "查看详情",
}: {
  interactive?: boolean;
  state?: "default" | "hover" | "active" | "disabled" | "loading";
  label?: string;
}) {
  const disabled = state === "disabled" || state === "loading";
  const staticClasses: Record<string, string> = {
    default: "bg-[#5B5BD6] text-white",
    hover: "bg-[#5151C9] text-white",
    active: "scale-[0.98] bg-[#4747B8] text-white",
    disabled: "cursor-not-allowed bg-[#5B5BD6] text-white opacity-40",
    loading: "bg-[#5B5BD6] text-white",
  };
  const interactiveClasses = interactive
    ? "cursor-pointer bg-[#5B5BD6] text-white hover:bg-[#5151C9] active:scale-[0.98] active:bg-[#4747B8] disabled:cursor-not-allowed disabled:opacity-40"
    : staticClasses[state];
  return (
    <button
      type="button"
      disabled={disabled}
      aria-busy={state === "loading"}
      className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium ${interactiveClasses}`}
    >
      {state === "loading" && <SpinnerIcon />}
      {state === "loading" ? "处理中" : label}
    </button>
  );
}

function SecondaryButton({
  interactive = false,
  state = "default",
  label = "稍后处理",
}: {
  interactive?: boolean;
  state?: "default" | "hover" | "active" | "disabled";
  label?: string;
}) {
  const disabled = state === "disabled";
  const staticClasses: Record<string, string> = {
    default: "bg-[#F3F2FB] text-[#5B5BD6]",
    hover: "bg-[#E9E8F7] text-[#5B5BD6]",
    active: "scale-[0.98] bg-[#DCDBF2] text-[#4747B8]",
    disabled: "cursor-not-allowed bg-[#F3F2FB] text-[#5B5BD6] opacity-40",
  };
  const interactiveClasses = interactive
    ? "cursor-pointer bg-[#F3F2FB] text-[#5B5BD6] hover:bg-[#E9E8F7] active:scale-[0.98] active:bg-[#DCDBF2] disabled:cursor-not-allowed disabled:opacity-40"
    : staticClasses[state];
  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium ${interactiveClasses}`}
    >
      {label}
    </button>
  );
}

function ShowcaseCard({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {children}
      <span className="text-xs text-[#9A9AB0]">{label}</span>
    </div>
  );
}

function ShowcaseButton({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
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

export default function EventCard() {
  return (
    <div className="flex flex-col gap-8 bg-white p-8">
      <section>
        <SectionTitle>交互演示</SectionTitle>
        <EventCardItem interactive />
      </section>

      <section>
        <SectionTitle>卡片状态陈列</SectionTitle>
        <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
          <ShowcaseCard label="默认">
            <EventCardItem />
          </ShowcaseCard>
          <ShowcaseCard label="悬浮">
            <div className="-translate-y-0.5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
              <EventCardItem />
            </div>
          </ShowcaseCard>
          <ShowcaseCard label="进行中">
            <EventCardItem status="ongoing" />
          </ShowcaseCard>
          <ShowcaseCard label="已结束">
            <EventCardItem status="done" />
          </ShowcaseCard>
          <ShowcaseCard label="长标题截断">
            <EventCardItem
              truncated
              title="超长事件标题占位文本第一行超出后第二行末尾以省略号截断处理"
            />
          </ShowcaseCard>
        </div>
      </section>

      <section>
        <SectionTitle>主按钮状态陈列</SectionTitle>
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          <ShowcaseButton label="默认">
            <PrimaryButton />
          </ShowcaseButton>
          <ShowcaseButton label="悬浮">
            <PrimaryButton state="hover" />
          </ShowcaseButton>
          <ShowcaseButton label="按压">
            <PrimaryButton state="active" />
          </ShowcaseButton>
          <ShowcaseButton label="禁用">
            <PrimaryButton state="disabled" />
          </ShowcaseButton>
          <ShowcaseButton label="加载">
            <PrimaryButton state="loading" />
          </ShowcaseButton>
        </div>
      </section>

      <section>
        <SectionTitle>次按钮状态陈列</SectionTitle>
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          <ShowcaseButton label="默认">
            <SecondaryButton />
          </ShowcaseButton>
          <ShowcaseButton label="悬浮">
            <SecondaryButton state="hover" />
          </ShowcaseButton>
          <ShowcaseButton label="按压">
            <SecondaryButton state="active" />
          </ShowcaseButton>
          <ShowcaseButton label="禁用">
            <SecondaryButton state="disabled" />
          </ShowcaseButton>
        </div>
      </section>
    </div>
  );
}
