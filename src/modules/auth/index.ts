/**
 * 认证模块顶入口（design「Interfaces / Produces」契约，Task 7）。
 *
 * 公共契约只从此处导出（依赖规则矩阵：app/components 跨模块仅可 import
 * 顶入口，禁深路径）；模块内部文件一律相对导入、禁止自引用本文件。
 * 后续任务（表单组件、守卫布局等）在此扩展导出。
 */
export { getCurrentSession } from "./queries";
export { registerAction } from "./actions";
export type { AuthSession } from "./queries";
export type { RegisterActionResult } from "./actions";
export type { RegisterInput } from "./schema";
