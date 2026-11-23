import { useState } from "react";
import WeekViewCalendar from "../components/week-view-calendar/week-view-calendar";
import CreateActivityModal from "../components/create-activity-modal/create-activity-modal";
import ChatPageLayout from "../layouts/chat-page-layout/code";
import AchievementsLayout from "../layouts/achievements-layout/code";
import CalendarGridLayout from "../layouts/calendar-grid-layout/code";
import WorkbenchLayout from "../layouts/workbench-layout/code";
import MonthCalendar from "../components/month-calendar/month-calendar";
import EventCard from "../components/event-card/event-card";
import CategoryFilterList from "../components/category-filter-list/category-filter-list";
import SearchInput from "../components/search-input/search-input";
import SearchInputWithButton from "../components/search-input-with-button/search-input-with-button";
import ChatPanel from "../components/chat-panel/chat-panel";

type DraftKey =
  | "week-view-calendar"
  | "create-activity-modal"
  | "chat-page-layout"
  | "achievements-layout"
  | "calendar-grid-layout"
  | "workbench-layout"
  | "month-calendar"
  | "event-card"
  | "category-filter-list"
  | "search-input"
  | "search-input-with-button"
  | "chat-panel";

const DRAFTS: { key: DraftKey; label: string; node: React.ReactNode }[] = [
  { key: "week-view-calendar", label: "周视图日程日历", node: <WeekViewCalendar /> },
  { key: "create-activity-modal", label: "创建活动弹窗", node: <CreateActivityModal /> },
  { key: "chat-page-layout", label: "聊天页布局骨架", node: <ChatPageLayout /> },
  { key: "achievements-layout", label: "成就展示页布局骨架", node: <AchievementsLayout /> },
  { key: "calendar-grid-layout", label: "日程页栅格布局骨架", node: <CalendarGridLayout /> },
  { key: "workbench-layout", label: "工作台布局骨架", node: <WorkbenchLayout /> },
  { key: "month-calendar", label: "月历日期选择器", node: <MonthCalendar /> },
  { key: "event-card", label: "日程事件卡片", node: <EventCard /> },
  { key: "category-filter-list", label: "分类筛选列表", node: <CategoryFilterList /> },
  { key: "search-input", label: "搜索输入框", node: <SearchInput /> },
  { key: "search-input-with-button", label: "带按钮搜索输入框", node: <SearchInputWithButton /> },
  { key: "chat-panel", label: "聊天伙伴面板", node: <ChatPanel /> },
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
