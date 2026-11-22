export default function AchievementsLayout() {
  return (
    <div className="flex h-screen min-h-[720px] w-full bg-white">
      <aside className="flex h-full w-[20%] items-center justify-center bg-[#D9D9D9]">
        <span className="text-sm font-semibold text-white">1、分类侧栏</span>
      </aside>
      <main className="flex h-full min-w-0 flex-1 flex-col gap-8 p-8">
        <div className="flex h-24 w-full items-center justify-center bg-[#D9D9D9]">
          <span className="text-sm font-semibold text-white">2.1、统计横幅</span>
        </div>
        <div className="flex min-h-0 w-full flex-1 items-center justify-center bg-[#D9D9D9]">
          <span className="text-sm font-semibold text-white">2.2、徽章网格区</span>
        </div>
      </main>
    </div>
  );
}
