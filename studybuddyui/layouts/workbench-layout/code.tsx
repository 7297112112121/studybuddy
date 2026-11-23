/**
 * 工作台布局骨架（灰盒草稿）：
 * 1、顶部栏（64px 通栏，承载产品标识与退出登录）
 * 2、AI 伙伴（左 2/3 全高，P0 视觉焦点）
 * 3、日历入口（右列顶部 80px，下方留白）
 * 仅布局区域占位，不含任何具体组件与真实文案。
 */
export default function WorkbenchLayout() {
  return (
    <div className="flex min-h-[720px] flex-col bg-white p-6">
      <div className="flex h-16 shrink-0 items-center justify-center bg-[#D9D9D9]">
        <span className="text-sm font-medium text-white">1、顶部栏</span>
      </div>
      <div className="mt-6 flex min-h-[560px] flex-1 gap-6">
        <div className="flex w-2/3 items-center justify-center bg-[#D9D9D9]">
          <span className="text-sm font-medium text-white">2、AI 伙伴</span>
        </div>
        <div className="flex w-1/3 flex-col gap-6">
          <div className="flex h-20 shrink-0 items-center justify-center bg-[#D9D9D9]">
            <span className="text-sm font-medium text-white">3、日历入口</span>
          </div>
        </div>
      </div>
    </div>
  );
}
