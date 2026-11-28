/**
 * /workbench 薄壳（design 边界 B10：工作台未实现，AXY-12 正式设计替换；
 * 数据流向评审裁决 1/5a）：零服务端数据读，承接屏在客户端经会话 store 取
 * 展示数据；守卫继承 (app)/layout 客户端会话守卫。
 */
import { WorkbenchScreen } from "@/features/workbench";

export default function WorkbenchPage() {
  return <WorkbenchScreen />;
}
