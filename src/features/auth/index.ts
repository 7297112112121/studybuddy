/**
 * 认证域 UI 顶入口（业务切片：features 持有 UI，见 docs/dev/代码目录.md）。
 *
 * 公共契约只从此处导出（app 跨域仅可 import 顶入口，禁深路径）；
 * 认证技术层（queries/service/validators/error）在 src/auth。
 */
export { default as AuthScreen } from "./components/AuthScreen";
export { default as AuthRedirect } from "./components/AuthRedirect";
export { default as SignOutButton } from "./components/SignOutButton";
export { default as AuroraBackground } from "./components/AuroraBackground";
export { default as PromoColumn } from "./components/PromoColumn";
export { default as HomeRedirect } from "./components/HomeRedirect";
