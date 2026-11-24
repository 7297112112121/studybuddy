/**
 * Better Auth 服务端实例（design「src/auth/better-auth.server.ts」契约，服务端 only）。
 *
 * 会话策略（ADR-0013）：Redis（secondaryStorage）为首要查询层，
 * `storeSessionInDatabase: true` 双写 PG 兜底；退出登录时 Better Auth
 * 同步删除 Redis 键与 PG 行（R11）。
 *
 * 注册不走 username 插件的邮箱注册路径（边界 #2：本期无邮箱凭据形态），
 * 由 ./service.ts 在单事务内直接插 user + credential account
 * （密码经 better-auth/crypto hashPassword，与核心同参数 scrypt）。
 * account 表存在 providerId = "credential" 记录即可用 /sign-in/username 登录。
 */
import { redisStorage } from "@better-auth/redis-storage";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { username } from "better-auth/plugins";

import { db } from "@/db/client";
import { account, session, user, verification } from "@/db/schema";
import { redis } from "@/common/redis";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_RE,
} from "./validators";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, account, session, verification },
  }),
  secondaryStorage: redisStorage({ client: redis, keyPrefix: "better-auth:" }),
  session: {
    storeSessionInDatabase: true,
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  emailAndPassword: {
    enabled: true,
    // 密码长度界限引用 validators 单一来源，禁止复写字面值
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
  },
  plugins: [
    username({
      usernameValidator: (u: string) => USERNAME_RE.test(u),
      // 账户名长度界限同源引用，与 USERNAME_RE 量词同常量（插件先查长度再跑 validator）
      minUsernameLength: USERNAME_MIN_LENGTH,
      maxUsernameLength: USERNAME_MAX_LENGTH,
      // 默认 toLowerCase；关闭后存储/登录查找/查重原样大小写（F-01/R14）
      usernameNormalization: false,
      // 产品无展示名概念，不加第二列（client 端 auth-client.ts 须一致）
      displayUsername: false,
      // 账户名为登录凭据、产品负空间无改名语义，防已登录会话经 /update-user 直连改名
      immutableUsername: true,
    }),
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (
        ctx.path === "/sign-up/email" ||
        ctx.path === "/sign-in/email" ||
        ctx.path === "/is-username-available"
      ) {
        throw new APIError("FORBIDDEN", { message: "Disabled endpoint" });
      }
    }),
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
  advanced: {
    database: {
      validateSchema: false,
    },
  },
});
