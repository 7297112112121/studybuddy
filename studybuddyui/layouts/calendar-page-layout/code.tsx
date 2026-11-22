export default function CalendarPageLayout() {
  return (
    <div className="flex h-screen min-h-[720px] w-full flex-col bg-white">
      <div className="mx-auto flex min-h-0 w-[54%] flex-1 flex-col pt-6 pb-24">
        <div className="flex h-12 w-[15%] min-w-[120px] items-center justify-center bg-[#D9D9D9]">
          <span className="text-sm font-semibold text-white">1、页面标题区</span>
        </div>
        <div className="mt-4 flex h-10 w-[25%] min-w-[200px] items-center justify-center bg-[#D9D9D9]">
          <span className="text-sm font-semibold text-white">2、工具栏区</span>
        </div>
        <div className="mt-4 flex min-h-0 flex-1 items-center justify-center bg-[#D9D9D9]">
          <span className="text-sm font-semibold text-white">3、周视图卡片</span>
        </div>
      </div>
    </div>
  );
}
