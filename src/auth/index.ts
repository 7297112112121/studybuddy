/**
 * 认证模块顶入口（design「Interfaces / Produces」契约，Task 7）。
 *
 * 公共契约只从此处导出（依赖规则矩阵：app 跨模块仅可 import 顶入口，禁深
 * 路径）；模块内部文件一律相对导入、禁止自引用本文件。
 * UI 层（components/useClientScreen）在 src/features/auth；注册写路径已
 * 收编为统一接口端点（评审裁决 5b，actions 废除）。
 */
export { getCurrentSession } from "./queries";
export type { AuthSession } from "./queries";
