import { useState } from "react";

type CategoryStatus = "default" | "hover" | "checked" | "unchecked" | "disabled";

type Category = {
  id: string;
  name: string;
  color: string;
  progress: number;
  checked: boolean;
  disabled?: boolean;
};

const DEMO_COLORS = ["#5B5BD6", "#19B5A9", "#F2994A"];

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CategoryCheckbox({
  color,
  checked,
  disabled = false,
  onToggle,
}: {
  color: string;
  checked: boolean;
  disabled?: boolean;
  onToggle?: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label="分类勾选"
      disabled={disabled}
      onClick={onToggle}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors ${
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      } ${
        checked
          ? "text-white"
          : "border-2 bg-white hover:opacity-80 active:opacity-60"
      }`}
      style={
        checked
          ? { backgroundColor: color }
          : { borderColor: color, color: "transparent" }
      }
    >
      {checked && <CheckIcon />}
    </button>
  );
}

function ProgressBar({
  color,
  value,
  muted = false,
}: {
  color: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div
      className="h-1 flex-1 overflow-hidden rounded-full bg-[#EEF0F5]"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${value}%`,
          backgroundColor: muted ? "#D5D6E2" : color,
        }}
      />
    </div>
  );
}

function CategoryRowItem({
  category,
  status = "default",
  onToggle,
}: {
  category: Category;
  status?: CategoryStatus;
  onToggle?: () => void;
}) {
  const muted = status === "disabled" || !category.checked;
  const rowClasses: Record<CategoryStatus, string> = {
    default: "",
    hover: "bg-[#F8F8FB]",
    checked: "",
    unchecked: "",
    disabled: "opacity-60",
  };
  const interactiveClasses =
    status === "default" && !category.disabled
      ? "cursor-pointer rounded-lg hover:bg-[#F8F8FB] active:bg-[#F3F2FB]"
      : "";
  return (
    <div
      className={`flex h-10 items-center gap-3 px-2 ${rowClasses[status]} ${interactiveClasses}`}
    >
      <CategoryCheckbox
        color={category.color}
        checked={status === "checked" || (status === "default" && category.checked)}
        disabled={status === "disabled" || category.disabled}
        onToggle={onToggle}
      />
      <span
        className={`w-20 shrink-0 text-sm ${
          muted ? "text-[#9A9AB0]" : "text-[#1A1A2E]"
        }`}
      >
        {category.name}
      </span>
      <ProgressBar
        color={category.color}
        value={category.progress}
        muted={status === "disabled"}
      />
    </div>
  );
}

function AddButton({
  state = "default",
  interactive = false,
}: {
  state?: "default" | "hover" | "active" | "disabled";
  interactive?: boolean;
}) {
  const disabled = state === "disabled";
  const staticClasses: Record<string, string> = {
    default: "text-[#6B6C85]",
    hover: "bg-[#F3F2FB] text-[#1A1A2E]",
    active: "scale-95 bg-[#E9E8F7] text-[#1A1A2E]",
    disabled: "cursor-not-allowed text-[#6B6C85] opacity-40",
  };
  const interactiveClasses = interactive
    ? "cursor-pointer text-[#6B6C85] hover:bg-[#F3F2FB] active:scale-95 active:bg-[#E9E8F7] disabled:cursor-not-allowed disabled:opacity-40"
    : staticClasses[state];
  return (
    <button
      type="button"
      aria-label="新增分类"
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-full border border-[#EEF0F5] ${interactiveClasses}`}
    >
      <PlusIcon />
    </button>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="mb-4 text-sm font-semibold text-[#1A1A2E]">{children}</h3>
  );
}

function ListHeader({ interactive = false }: { interactive?: boolean }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h4 className="text-base font-semibold text-[#1A1A2E]">分类</h4>
      <AddButton interactive={interactive} />
    </div>
  );
}

export default function CategoryFilterList() {
  const [categories, setCategories] = useState<Category[]>([
    { id: "c1", name: "分类项一", color: DEMO_COLORS[0], progress: 80, checked: true },
    { id: "c2", name: "分类项二", color: DEMO_COLORS[1], progress: 55, checked: true },
    { id: "c3", name: "分类项三", color: DEMO_COLORS[2], progress: 20, checked: false },
  ]);

  const toggle = (id: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c)),
    );
  };

  return (
    <div className="flex flex-col gap-8 bg-white p-8">
      <section>
        <SectionTitle>交互演示</SectionTitle>
        <div className="w-80 rounded-xl border border-[#EEF0F5] p-4">
          <ListHeader interactive />
          {categories.map((category) => (
            <CategoryRowItem
              key={category.id}
              category={category}
              onToggle={() => toggle(category.id)}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>行状态陈列</SectionTitle>
        <div className="flex w-80 flex-col gap-4 rounded-xl border border-[#EEF0F5] p-4">
          {(
            [
              ["默认(勾选)", "default", DEMO_COLORS[0], 80, true],
              ["悬浮", "hover", DEMO_COLORS[0], 80, true],
              ["勾选", "checked", DEMO_COLORS[1], 55, true],
              ["未勾选", "unchecked", DEMO_COLORS[2], 20, false],
              ["禁用", "disabled", DEMO_COLORS[0], 40, true],
            ] as const
          ).map(([label, status, color, progress, checked]) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div className="w-full">
                <CategoryRowItem
                  status={status}
                  category={{
                    id: label,
                    name: "分类项",
                    color,
                    progress,
                    checked,
                  }}
                />
              </div>
              <span className="text-xs text-[#9A9AB0]">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>新增按钮状态陈列</SectionTitle>
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          {(
            [
              ["默认", "default"],
              ["悬浮", "hover"],
              ["按压", "active"],
              ["禁用", "disabled"],
            ] as const
          ).map(([label, state]) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <AddButton state={state} />
              <span className="text-xs text-[#9A9AB0]">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>空列表态</SectionTitle>
        <div className="w-80 rounded-xl border border-[#EEF0F5] p-4">
          <ListHeader />
          <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-[#D5D6E2]">
            <span className="text-sm text-[#9A9AB0]">暂无分类，点击右上角新增</span>
          </div>
        </div>
      </section>
    </div>
  );
}
