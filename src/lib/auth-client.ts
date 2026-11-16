/**
 * Better Auth 客户端 SDK（design「src/lib/auth-client.ts」契约，client-safe）。
 *
 * 登录/登出由客户端 SDK 直调（ADR-0013「客户端登录 UI 由官方客户端 SDK 驱动」）：
 * - `authClient.signIn.username({ username, password })`
 * - `authClient.signOut()`
 * 注册是表单突变，走 Server Action（ADR-0025），不经此客户端。
 */
import { createAuthClient } from "better-auth/client";
import { usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // displayUsername 须与 server 端 username 插件一致（false：无第二列，
  // client 类型面同步收窄）
  plugins: [usernameClient({ displayUsername: false })],
});
