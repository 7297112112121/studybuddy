/**
 * Better Auth 服务端实例（design「src/lib/auth.ts」契约，服务端 only）。
 *
 * 会话策略（ADR-0013）：Redis（secondaryStorage）为首要查询层，
 * `storeSessionInDatabase: true` 双写 PG 兜底；退出登录时 Better Auth
 * 同步删除 Redis 键与 PG 行（R11）。
 *
 * 注册不走 phoneNumber 插件的 OTP 注册路径（非目标 #1：短信通道未就绪），
 * 由 modules/auth/service.ts 在单事务内直接插 user + credential account
 * （密码经 better-auth/crypto hashPassword，与核心同参数 scrypt）。
 * account 表存在 providerId = "credential" 记录即可用 /sign-in/phone-number 登录。
 */
import { redisStorage } from "@better-auth/redis-storage";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { phoneNumber } from "better-auth/plugins";

import { db } from "@/db/client";
import { account, session, user, verification } from "@/db/schema";
import { redis } from "@/lib/redis";

/** 与 modules/auth/validators 的 PHONE_RE 保持一致（同步性由单元测试守护） */
const PHONE_RE = /^1[3-9]\d{9}$/;

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
  // phoneNumber 插件密码校验的基座；邮箱端点本身已被下方 hook 拦死。
  // 限流保持默认开启（全局规则 + 插件对手机号路径的 10 次/60 秒限制），防凭证填充。
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 20,
  },
  plugins: [
    phoneNumber({
      phoneNumberValidator: (phoneNumber: string) => PHONE_RE.test(phoneNumber),
      // 短信通道未就绪（非目标 #1）：OTP 端点可达但码无处投递，不可被利用；
      // 通道就绪后替换为真实发送实现（后续迭代）
      sendOTP: async () => {},
    }),
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // 非目标 #4：仅手机号注册。显式禁用邮箱注册/登录端点，防 API 直连绕过
      // （design 契约为 matcher+handler 数组形态，即插件级 hook 形状；
      // betterAuth 选项级 hooks.before 在 1.7 为单个 AuthMiddleware，
      // 故以 createAuthMiddleware 落成等价语义）。
      if (ctx.path === "/sign-up/email" || ctx.path === "/sign-in/email") {
        throw new APIError("FORBIDDEN", { message: "Email auth is disabled" });
      }
    }),
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
  advanced: {
    database: {
      // Better Auth 1.7 运行时 schema 校验要求 user 表全部 notNull 无默认列
      // 必须由 Better Auth 写入，否则抛 SchemaMismatchError。本设计的
      // agreementVersion/agreedAt（R15 留痕）由 registerWithPhone 在注册
      // 事务中写入，Better Auth 自身不存在可达的 user 插入路径
      // （sign-up/email 被 hook 403、OTP 注册因 sendOTP no-op 不可利用），
      // 校验属误报，故关闭（Task 6 实测发现，待 design 回写）。
      validateSchema: false,
    },
  },
});
