export default function ChatPageLayout() {
  return (
    <div className="flex h-screen min-h-[720px] w-full bg-white">
      <aside className="flex h-full w-[12%] min-w-[220px] items-center justify-center bg-[#D9D9D9]">
        <span className="text-sm font-semibold text-white">1、侧边栏</span>
      </aside>
      <main className="flex h-full flex-1 flex-col items-center justify-center gap-8 pb-24">
        <div className="flex h-16 w-[30%] items-center justify-center bg-[#D9D9D9]">
          <span className="text-sm font-semibold text-white">2.1、欢迎标题区</span>
        </div>
        <div className="flex h-44 w-[51%] items-center justify-center bg-[#D9D9D9]">
          <span className="text-sm font-semibold text-white">2.2、输入卡片区</span>
        </div>
      </main>
    </div>
  );
}
