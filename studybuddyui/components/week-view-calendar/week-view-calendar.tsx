"use client";

import { useState } from "react";

/* ── 色板(规格约束:仅使用以下色值,primary 只允许 #5B5BD6) ── */
const C = {
  primary: "#5B5BD6",
  title: "#1A1A2E",
  muted: "#9A9AB0",
  gridLine: "#EEF0F5",
  red: "#F5484B",
  border: "#E7E6F2",
  segBg: "#F3F2FB",
};

/* 事件分类配色 */
const THEMES = {
  clients: { bg: "#E9F1FF", text: "#3D8AF7" },
  lavender: { bg: "#EDEBFF", text: "#5B5BD6" },
  work: { bg: "#FFF3E3", text: "#F59E4A" },
  personal: { bg: "#FBE7F1", text: "#E85D9E" },
} as const;

type ThemeKey = keyof typeof THEMES;

const START_HOUR = 7;
const END_HOUR = 12;
const HOUR_HEIGHT = 64;
const GRID_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT; // 5 行 × 64px

const DAYS: { name: string; date: string; today?: boolean }[] = [
  { name: "Monday", date: "21.09" },
  { name: "Tuesday", date: "22.09", today: true },
  { name: "Wednesday", date: "23.09" },
  { name: "Thursday", date: "24.09" },
  { name: "Friday", date: "25.09" },
  { name: "Saturday", date: "26.09" },
  { name: "Sunday", date: "27.09" },
];

const HOUR_LABELS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
  const h = START_HOUR + i;
  return `${String(h).padStart(2, "0")}:00`;
});

type CalendarEvent = {
  day: number;
  start: number;
  end: number;
  title: string;
  theme: ThemeKey;
  tag: string;
  marker?: "square" | "dot";
  badge?: string; // 粉色胶囊标签(如 "30 min to go")
  flame?: boolean;
};

const EVENTS: CalendarEvent[] = [
  {
    day: 0,
    start: 7,
    end: 9,
    title: "Show project to Jes Parker",
    theme: "clients",
    tag: "Clients",
    marker: "square",
  },
  {
    day: 1,
    start: 10,
    end: 12,
    title: "Meet Jason at the International Airport",
    theme: "lavender",
    tag: "Clients",
    badge: "30 min to go",
    flame: true,
  },
  {
    day: 4,
    start: 7,
    end: 9,
    title: "Meeting with a team",
    theme: "work",
    tag: "Work",
    marker: "dot",
  },
  {
    day: 6,
    start: 10,
    end: 12,
    title: "Call with Clark Kent",
    theme: "personal",
    tag: "Personal",
  },
];

function FlameIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={C.red} aria-hidden="true">
      <path d="M13.5 0.67s0.74 2.65 0.74 4.8c0 2.06-1.67 3.73-3.73 3.73-2.06 0-3.73-1.67-3.73-3.73l0.03-0.36C5.21 9.51 4 13.03 4 16c0 4.42 3.58 8 8 8s8-3.58 8-8C20 10.61 17.41 5.06 13.5 0.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-0.36 3.6-1.21 4.62-2.58 0.39 1.29 0.59 2.65 0.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={C.muted}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === "left" ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
    </svg>
  );
}

export default function WeekViewCalendar() {
  const [view, setView] = useState<"Week" | "Month" | "Year">("Week");

  const nowTop = (9.5 - START_HOUR) * HOUR_HEIGHT; // 当前时间 09:30

  return (
    <section className="w-full max-w-[880px] rounded-2xl bg-white p-6 shadow-[0_4px_16px_rgba(91,91,214,0.08)]">
      {/* ── 顶部工具栏 ── */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <h2 className="text-[22px] font-bold text-[#1A1A2E]">September, 2020</h2>

        <div className="flex items-center rounded-full bg-[#F3F2FB] p-1">
          {(["Week", "Month", "Year"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={
                "rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors " +
                (view === v ? "bg-white text-[#5B5BD6] shadow-sm" : "text-[#9A9AB0] hover:text-[#5A5A72]")
              }
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-self-end gap-2 text-[#5A5A72]">
          <button
            type="button"
            aria-label="Previous week"
            className="flex h-9 w-12 items-center justify-center rounded-lg border border-[#E7E6F2] bg-white hover:bg-[#F7F7FC]"
          >
            <ChevronIcon direction="left" />
          </button>
          <button
            type="button"
            className="h-9 w-12 rounded-lg border border-[#E7E6F2] bg-white text-[13px] font-semibold hover:bg-[#F7F7FC]"
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Next week"
            className="flex h-9 w-12 items-center justify-center rounded-lg border border-[#E7E6F2] bg-white hover:bg-[#F7F7FC]"
          >
            <ChevronIcon direction="right" />
          </button>
        </div>
      </div>

      {/* ── 表头行 ── */}
      <div className="mt-6 grid grid-cols-[64px_repeat(7,1fr)]">
        <div className="flex items-start justify-end pr-3 pt-0.5">
          <CalendarIcon />
        </div>
        {DAYS.map((d) => (
          <div key={d.name} className="text-center">
            <p
              className="text-[13px] font-semibold"
              style={{ color: d.today ? C.primary : C.title }}
            >
              {d.name}
            </p>
            <p className="mt-0.5 text-[11px]" style={{ color: C.muted }}>
              {d.date}
            </p>
          </div>
        ))}
      </div>

      {/* ── 主体网格 ── */}
      <div className="mt-4 grid grid-cols-[64px_1fr]">
        {/* 时间轴 */}
        <div className="relative" style={{ height: GRID_HEIGHT }}>
          {HOUR_LABELS.map((label, i) => (
            <span
              key={label}
              className="absolute right-3 -translate-y-1/2 text-[11px]"
              style={{ top: i * HOUR_HEIGHT, color: C.muted }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* 7 列网格 */}
        <div className="relative" style={{ height: GRID_HEIGHT }}>
          {/* 浅灰横线 */}
          {HOUR_LABELS.map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 h-px"
              style={{ top: i * HOUR_HEIGHT, backgroundColor: C.gridLine }}
            />
          ))}

          {/* 当前时间线 09:30 */}
          <div
            className="absolute left-0 right-0 z-10 h-px"
            style={{ top: nowTop, backgroundColor: C.red }}
          >
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full px-2 py-[3px] text-[11px] font-semibold text-white"
              style={{ backgroundColor: C.red }}
            >
              09:30
            </span>
          </div>

          {/* 事件卡片 */}
          {EVENTS.map((ev) => {
            const theme = THEMES[ev.theme];
            return (
              <div
                key={ev.title}
                className="absolute z-[5] flex flex-col rounded-xl p-2.5 shadow-[0_6px_16px_rgba(91,91,214,0.10)]"
                style={{
                  top: (ev.start - START_HOUR) * HOUR_HEIGHT + 1,
                  height: (ev.end - ev.start) * HOUR_HEIGHT - 2,
                  left: `calc(${ev.day} * 100% / 7 + 4px)`,
                  width: `calc(100% / 7 - 8px)`,
                  backgroundColor: theme.bg,
                }}
              >
                {ev.badge && (
                  <div className="mb-1 flex items-center gap-1.5">
                    {ev.flame && <FlameIcon />}
                    <span
                      className="whitespace-nowrap rounded-full px-2 py-[2px] text-[10px] font-semibold"
                      style={{ backgroundColor: "#FCE1E9", color: C.red }}
                    >
                      {ev.badge}
                    </span>
                  </div>
                )}
                <p className="text-[12px] font-semibold leading-snug" style={{ color: C.title }}>
                  {ev.title}
                </p>
                <div className="mt-auto flex items-center gap-1.5">
                  {ev.marker === "square" && (
                    <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: theme.text }} />
                  )}
                  {ev.marker === "dot" && (
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.text }} />
                  )}
                  <span className="text-[11px] font-medium" style={{ color: theme.text }}>
                    {ev.tag}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
