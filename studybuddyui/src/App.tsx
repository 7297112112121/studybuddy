import { useState } from "react";
import WeekViewCalendar from "../components/week-view-calendar/week-view-calendar";
import CreateActivityModal from "../components/create-activity-modal/create-activity-modal";
import ChatPageLayout from "../layouts/chat-page-layout/code";
import AchievementsLayout from "../layouts/achievements-layout/code";
import CalendarGridLayout from "../layouts/calendar-grid-layout/code";

type DraftKey =
  | "week-view-calendar"
  | "create-activity-modal"
  | "chat-page-layout"
  | "achievements-layout"
  | "calendar-grid-layout";

const DRAFTS: { key: DraftKey; label: string; node: React.ReactNode }[] = [
  { key: "week-view-calendar", label: "周视图日程日历", node: <WeekViewCalendar /> },
  { key: "create-activity-modal", label: "创建活动弹窗", node: <CreateActivityModal /> },
  { key: "chat-page-layout", label: "聊天页布局骨架", node: <ChatPageLayout /> },
  { key: "achievements-layout", label: "成就展示页布局骨架", node: <AchievementsLayout /> },
  { key: "calendar-grid-layout", label: "日程页栅格布局骨架", node: <CalendarGridLayout /> },
];

export default function App() {
  const [active, setActive] = useState<DraftKey>("week-view-calendar");
  const draft = DRAFTS.find((d) => d.key === active)!;

  return (
    <main className="min-h-screen bg-white text-[#1A1A2E]">
      <nav className="flex gap-2 border-b border-[#EEF0F5] p-4">
        {DRAFTS.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => setActive(d.key)}
            className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              d.key === active
                ? "bg-[#5B5BD6] text-white"
                : "text-[#9A9AB0] hover:bg-[#F3F2FB]"
            }`}
          >
            {d.label}
          </button>
        ))}
      </nav>
      <div key={draft.key}>{draft.node}</div>
    </main>
  );
}
