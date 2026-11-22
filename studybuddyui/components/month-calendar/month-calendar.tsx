import { useMemo, useState } from "react";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const PRIMARY = "bg-[#5B5BD6]";

type CellVisualState =
  | "default"
  | "hover"
  | "active"
  | "selected"
  | "today"
  | "event"
  | "disabled";

type CalendarCell = {
  key: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasEvent: boolean;
};

function buildCells(
  year: number,
  month: number,
  selectedDay: number,
  eventDays: number[],
): CalendarCell[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const today = new Date();
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const dayNum = i - startOffset + 1;
    let date: Date;
    let inMonth: boolean;
    if (dayNum < 1) {
      date = new Date(year, month - 1, prevMonthDays + dayNum);
      inMonth = false;
    } else if (dayNum > daysInMonth) {
      date = new Date(year, month + 1, dayNum - daysInMonth);
      inMonth = false;
    } else {
      date = new Date(year, month, dayNum);
      inMonth = true;
    }
    cells.push({
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      day: date.getDate(),
      inMonth,
      isToday:
        inMonth &&
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate(),
      isSelected: inMonth && dayNum === selectedDay,
      hasEvent: inMonth && eventDays.includes(dayNum),
    });
  }
  return cells;
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      {direction === "left" ? (
        <path d="M15 6l-6 6 6 6" />
      ) : (
        <path d="M9 6l6 6-6 6" />
      )}
    </svg>
  );
}

function NavButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-[#6B6C85] transition-colors ${
        disabled
          ? "cursor-not-allowed opacity-40"
          : "cursor-pointer hover:bg-[#F3F2FB] active:bg-[#E9E8F7]"
      }`}
    >
      <ChevronIcon direction={label === "上个月" ? "left" : "right"} />
    </button>
  );
}

function staticCellClasses(state: CellVisualState, isSelected: boolean): string {
  switch (state) {
    case "hover":
      return "bg-[#F3F2FB] text-[#1A1A2E]";
    case "active":
      return "scale-95 bg-[#E9E8F7] text-[#1A1A2E]";
    case "selected":
      return `${PRIMARY} font-semibold text-white`;
    case "today":
      return "border-2 border-[#5B5BD6] font-semibold text-[#5B5BD6]";
    case "event":
      return "text-[#1A1A2E]";
    case "disabled":
      return "cursor-not-allowed text-[#D5D6E2]";
    default:
      return isSelected ? "text-white" : "text-[#1A1A2E]";
  }
}

function interactiveCellClasses(cell: CalendarCell): string {
  if (!cell.inMonth) return "cursor-not-allowed text-[#D5D6E2]";
  if (cell.isSelected) return `${PRIMARY} font-semibold text-white`;
  if (cell.isToday)
    return "border-2 border-[#5B5BD6] font-semibold text-[#5B5BD6]";
  return "cursor-pointer text-[#1A1A2E] hover:bg-[#F3F2FB] active:bg-[#E9E8F7]";
}

function EventDot({ visible, white }: { visible: boolean; white: boolean }) {
  if (!visible) return null;
  return (
    <span
      aria-hidden="true"
      className={`absolute bottom-0.5 h-1 w-1 rounded-full ${
        white ? "bg-white" : "bg-[#5B5BD6]"
      }`}
    />
  );
}

function ShowcaseCell({
  state,
  label,
  isSelected = false,
}: {
  state: CellVisualState;
  label: string;
  isSelected?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative flex h-8 w-8 items-center justify-center rounded-full text-sm ${staticCellClasses(state, isSelected)}`}
      >
        15
        <EventDot visible={state === "event"} white={false} />
      </div>
      <span className="text-xs text-[#9A9AB0]">{label}</span>
    </div>
  );
}

function ShowcaseNavButton({
  state,
  label,
}: {
  state: "default" | "hover" | "active" | "disabled";
  label: string;
}) {
  const classes: Record<typeof state, string> = {
    default: "text-[#6B6C85]",
    hover: "bg-[#F3F2FB] text-[#1A1A2E]",
    active: "scale-95 bg-[#E9E8F7] text-[#1A1A2E]",
    disabled: "cursor-not-allowed opacity-40 text-[#6B6C85]",
  };
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${classes[state]}`}
      >
        <ChevronIcon direction="right" />
      </div>
      <span className="text-xs text-[#9A9AB0]">{label}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="mb-4 text-sm font-semibold text-[#1A1A2E]">{children}</h3>
  );
}

export default function MonthCalendar() {
  const today = new Date();
  const [view, setView] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [selectedDay, setSelectedDay] = useState(15);
  const eventDays = [3, 11, 12, 17, 24, 25];
  const cells = useMemo(
    () => buildCells(view.year, view.month, selectedDay, eventDays),
    [view, selectedDay],
  );

  const shiftMonth = (delta: number) => {
    setView((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  return (
    <div className="flex flex-col gap-8 bg-white p-8">
      <section>
        <SectionTitle>交互演示</SectionTitle>
        <div className="mx-auto w-80 rounded-xl border border-[#EEF0F5] p-4">
          <div className="flex items-center justify-center gap-4">
            <NavButton label="上个月" onClick={() => shiftMonth(-1)} />
            <span className="text-sm font-semibold text-[#1A1A2E]">
              {view.year}年{view.month + 1}月
            </span>
            <NavButton label="下个月" onClick={() => shiftMonth(1)} />
          </div>
          <div className="mt-4 grid grid-cols-7">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="flex h-8 items-center justify-center text-xs text-[#9A9AB0]"
              >
                {weekday}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1" role="grid">
            {cells.map((cell) => (
              <div
                key={cell.key}
                className="flex items-center justify-center"
                role="gridcell"
              >
                <button
                  type="button"
                  disabled={!cell.inMonth}
                  aria-label={`${cell.day}日${cell.hasEvent ? "，含日程" : ""}`}
                  aria-pressed={cell.isSelected}
                  onClick={() => cell.inMonth && setSelectedDay(cell.day)}
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors ${interactiveCellClasses(cell)}`}
                >
                  {cell.day}
                  <EventDot
                    visible={cell.hasEvent && !cell.isSelected}
                    white={false}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>日期格状态陈列</SectionTitle>
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          <ShowcaseCell state="default" label="默认" />
          <ShowcaseCell state="hover" label="悬浮" />
          <ShowcaseCell state="active" label="按压" />
          <ShowcaseCell state="selected" isSelected label="选中" />
          <ShowcaseCell state="today" label="今日" />
          <ShowcaseCell state="event" label="含事件" />
          <ShowcaseCell state="disabled" label="禁用(非本月)" />
        </div>
      </section>

      <section>
        <SectionTitle>翻页按钮状态陈列</SectionTitle>
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          <ShowcaseNavButton state="default" label="默认" />
          <ShowcaseNavButton state="hover" label="悬浮" />
          <ShowcaseNavButton state="active" label="按压" />
          <ShowcaseNavButton state="disabled" label="禁用(边界月)" />
        </div>
      </section>
    </div>
  );
}
