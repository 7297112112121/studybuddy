export default function CalendarGridLayout() {
  return (
    <div className="flex h-screen min-h-[720px] w-full flex-col bg-white">
      <div className="mx-auto flex min-h-0 w-[67%] flex-1 flex-col pt-6 pb-24">
        <div className="flex h-14 items-center justify-between">
          <div className="flex h-14 w-1/4 items-center justify-center bg-[#D9D9D9]">
            <span className="text-sm font-semibold text-white">1、页面标题区</span>
          </div>
          <div className="flex h-14 w-[37.5%] items-center justify-center bg-[#D9D9D9]">
            <span className="text-sm font-semibold text-white">2、工具栏区</span>
          </div>
        </div>
        <div className="mt-6 flex min-h-0 flex-1 items-center justify-center bg-[#D9D9D9]">
          <span className="text-sm font-semibold text-white">3、周视图卡片</span>
        </div>
      </div>
    </div>
  );
}
