/**
 * Better Auth 客户端 SDK（design「src/stores/auth-client.ts」契约，client-safe）。

 */
import { createAuthClient } from "better-auth/client";
import { usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // displayUsername 须与 server 端 username 插件一致（false：无第二列，
  // client 类型面同步收窄）
  plugins: [usernameClient({ displayUsername: false })],
});
