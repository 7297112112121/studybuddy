/**
 * Better Auth 服务端实例（design「src/lib/auth.ts」契约，服务端 only）。
 *
 * 会话策略（ADR-0013）：Redis（secondaryStorage）为首要查询层，
 * `storeSessionInDatabase: true` 双写 PG 兜底；退出登录时 Better Auth
 * 同步删除 Redis 键与 PG 行（R11）。
 *
 * 注册不走 username 插件的邮箱注册路径（边界 #2：本期无邮箱凭据形态），
 * 由 modules/auth/service.ts 在单事务内直接插 user + credential account
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
import { redis } from "@/lib/redis";
import { USERNAME_RE } from "@/lib/username";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    // drizzle-orm 1.0 RC 移除了 client 构造时的 schema 运行时选项
    // （src/db/client.ts 经 relations 传入关系配置），适配器的
    // db._.fullSchema 回退不再可用，故在此显式传入表映射。
    schema: { user, account, session, verification },
  }),
  // 仅存可丢失数据（ADR-0007 纪律）：会话缓存/限流计数；键前缀与
  // design 契约一致。
  secondaryStorage: redisStorage({ client: redis, keyPrefix: "better-auth:" }),
  session: {
    storeSessionInDatabase: true,
    // 会话时长 7 天、每 24h 滚动续期（design「数据模型」session.expires_at）
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  // enabled 无可达端点（两个 email 端点被下方 hook 403，注册唯一路径是
  // registerAction）；块本身保留——min/maxPasswordLength 8/20 经
  // context.password.config 约束登录路径密码长度上限（assertPasswordNotTooLong）。
  // 限流保持默认开启：内置 specialRule 按 /sign-in 前缀 3 次/10 秒，
  // 覆盖 /sign-in/username，防凭证填充。
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 20,
  },
  plugins: [
    username({
      // 账户名合法域单一来源（F-01）：真源 @/lib/username，默认正则拒中文，必须覆盖
      usernameValidator: (u: string) => USERNAME_RE.test(u),
      minUsernameLength: 1, // 插件默认 3
      maxUsernameLength: 16, // 插件默认 30
      // 默认 toLowerCase；关闭后存储/登录查找/查重原样大小写（F-01/R14）
      usernameNormalization: false,
      // 产品无展示名概念，不加第二列（client 端 auth-client.ts 须一致）
      displayUsername: false,
      // 账户名为登录凭据、产品负空间无改名语义，防已登录会话经 /update-user 直连改名
      immutableUsername: true,
    }),
  ],
  // 选项级 hooks.before 在 Better Auth 1.7 为单个 AuthMiddleware，先于插件
  // hooks 且 matcher 恒真——插件 hooks 仅挂 /sign-up/email 与 /update-user：
  // 前者本就被 403、后者经 immutableUsername 拒绝，无冲突（原 Task 4 裁决形态继续有效）。
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // 边界 #2 / 非目标 #4：本期无邮箱凭据形态，占位邮箱不得凭据化
      // （/sign-in/email），注册唯一路径是 registerAction（/sign-up/email）；
      // /is-username-available 无 UI 消费者，直连构成账户名枚举面
      // （R7 不可探测纪律）。
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
      // Better Auth 1.7 运行时 schema 校验对 registerWithUsername 直写的
      // agreementVersion/agreedAt 列（R15）误报 SchemaMismatchError，
      // 而本设计无自身可达的 user 插入路径（sign-up/email 被 hook 403），
      // 校验属误报，故关闭（原 Task 6 裁决继续有效）。
      validateSchema: false,
    },
  },
});
