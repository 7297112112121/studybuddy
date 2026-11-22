"use client";

import { useState } from "react";

/* ── 色板(来源:docs/日常创建弹窗-design-token.json,禁止自创色值) ── */
const C = {
  primary: "#593BFF",
  primaryHover: "#4A2FE0",
  textPrimary: "#23243A",
  textSecondary: "#8B8DA6",
  divider: "#ECECF1",
  chipOffBg: "#F4F4F8",
  overlay: "rgba(31,32,51,0.35)",
  shadow: "0 20px 50px -12px rgba(31,32,51,0.25)",
};

/* 分类 chip 配色 */
const THEMES = {
  work: { label: "Work", bg: "#FFF1E6", text: "#F2994A" },
  clients: { label: "Clients projects", bg: "#F0EDFC", text: "#6C5CE7" },
  personal: { label: "Personal projects", bg: "#EAF3FD", text: "#3B82F6" },
} as const;

type ThemeKey = keyof typeof THEMES;

/* 成员头像占位渐变(色值均取自规格色板,不引入真实图片链接) */
const AVATARS = [
  "linear-gradient(135deg, #F2994A, #6C5CE7)",
  "linear-gradient(135deg, #3B82F6, #593BFF)",
  "linear-gradient(135deg, #6C5CE7, #F2994A)",
  "linear-gradient(135deg, #3B82F6, #F2994A)",
];

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" {...strokeProps}>
      <rect x="3" y="4.5" width="18" height="17" rx="3" />
      <path d="M8 2.5v4M16 2.5v4M3 10.5h18" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" {...strokeProps}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function IconMapPin() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" {...strokeProps}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconPlus({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconPlusFilled({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" />
    </svg>
  );
}

export default function CreateActivityModal() {
  const [selected, setSelected] = useState<Record<ThemeKey, boolean>>({
    work: true,
    clients: true,
    personal: true,
  });

  const toggle = (key: ThemeKey) =>
    setSelected((s) => ({ ...s, [key]: !s[key] }));

  return (
    /* 遮罩层 */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-[fade-in_200ms_ease-out]"
      style={{ background: C.overlay }}
    >
      {/* 弹窗容器:288px / 圆角16px / 内边距24px */}
      <div
        className="w-72 rounded-2xl bg-white p-6 animate-[modal-in_200ms_ease-out]"
        style={{ boxShadow: C.shadow }}
      >
        {/* 标题 */}
        <h2
          className="mb-5 text-lg font-semibold"
          style={{ color: C.textPrimary }}
        >
          Meet with Tom Comp
        </h2>

        {/* 日期行 */}
        <div
          className="flex items-center justify-between border-b py-3.5"
          style={{ borderColor: C.divider }}
        >
          <span
            className="flex-1 text-sm font-normal"
            style={{ color: C.textPrimary }}
          >
            Thursday, 23 September
          </span>
          <span style={{ color: C.textSecondary }}>
            <IconCalendar />
          </span>
        </div>

        {/* 时间行:左右两栏下拉选择器(仅触发态) */}
        <div
          className="flex gap-4 border-b py-3.5"
          style={{ borderColor: C.divider }}
        >
          {["07:00", "08:00"].map((time) => (
            <button
              key={time}
              type="button"
              className="flex flex-1 cursor-pointer items-center justify-between"
            >
              <span
                className="text-sm font-normal"
                style={{ color: C.textPrimary }}
              >
                {time}
              </span>
              <span style={{ color: C.textSecondary }}>
                <IconChevronDown />
              </span>
            </button>
          ))}
        </div>

        {/* 地点行 */}
        <div
          className="flex items-center justify-between border-b py-3.5"
          style={{ borderColor: C.divider }}
        >
          <span
            className="flex-1 text-sm font-normal"
            style={{ color: C.textPrimary }}
          >
            St Patrick Street, 18
          </span>
          <span style={{ color: C.textSecondary }}>
            <IconMapPin />
          </span>
        </div>

        {/* 分类标签区:可切换选中态,默认均为已选中(彩色浅底) */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
            const on = selected[key];
            const theme = THEMES[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className="h-7 cursor-pointer rounded-lg px-3 text-xs font-medium"
                style={{
                  background: on ? theme.bg : C.chipOffBg,
                  color: on ? theme.text : C.textSecondary,
                }}
              >
                {theme.label}
              </button>
            );
          })}
        </div>

        {/* 成员头像区 */}
        <div className="mt-5 flex items-center gap-2">
          {AVATARS.map((bg) => (
            <div
              key={bg}
              className="h-8 w-8 rounded-full ring-2 ring-white"
              style={{ background: bg }}
            />
          ))}
          <button
            type="button"
            aria-label="添加成员"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-[#593BFF]/40"
            style={{ color: C.primary }}
          >
            <IconPlus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 主按钮:圆角12px,hover #4A2FE0 */}
        <button
          type="button"
          className="mt-6 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#593BFF] text-sm font-medium text-white transition-colors hover:bg-[#4A2FE0] active:scale-[0.98]"
        >
          <IconPlusFilled className="h-4 w-4" />
          Create Activity
        </button>
      </div>
    </div>
  );
}
