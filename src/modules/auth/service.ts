/**
 * 认证域写路径 service（design「modules/auth/service.ts」契约，Task 5）。
 *
 * registerWithPhone 在单事务内插 user（含 agreement 留痕 R15）+ credential
 * account（密码经 hashPassword 摘要，R13 永不存明文）；PG 23505 且约束为
 * user_phone_number 唯一索引时映射 PHONE_ALREADY_REGISTERED（R10/R14）。
 * 入参校验由调用方完成（actions 层 zod 复验）；本函数与调用链不记录任何
 * 入参（R13 日志纪律）。
 */
import { hashPassword } from "better-auth/crypto";

import { db } from "@/db/client";
import { account, user } from "./schema";

/** 当前协议版本（R15）；协议正文为占位（非目标 #5） */
export const AGREEMENT_VERSION = "v1" as const;

/** 占位邮箱：`.invalid` 为 RFC 2606 保留 TLD，永不展示、不投递 */
export function phoneToPlaceholderEmail(phone: string): string {
  return `${phone}@phone.styb.invalid`;
}

export type RegisterOutcome =
  | { ok: true; userId: string }
  | { ok: false; error: "PHONE_ALREADY_REGISTERED" };

/**
 * 手机号唯一冲突的识别：postgres-js 的 PostgresError 携带 PG 错误码与
 * 约束名；23505 为 unique_violation。drizzle 将底层错误包装为
 * DrizzleQueryError（码与约束名在 cause 链上），故沿 cause 链探测。
 *
 * 两个约束都映射：user_phone_number 是 R14 显式命名的唯一索引；
 * user_email_key 是 email 列的表级 UNIQUE——占位邮箱由手机号确定性派生
 * （phoneToPlaceholderEmail），email 冲突当且仅当同一手机号已注册。
 * PG 按索引创建顺序检查，email 约束随建表创建、先于 phone 唯一索引
 * 抛出（集成测试实测），故仅认 user_phone_number 会漏判（Task 5 偏离
 * design「23505 且约束为 user_phone_number」原文，语义等价）。
 */
function isPhoneUniqueViolation(err: unknown): boolean {
  let e = err as {
    code?: string;
    constraint_name?: string;
    cause?: unknown;
  } | null | undefined;
  while (e) {
    if (
      e.code === "23505" &&
      (e.constraint_name === "user_phone_number" ||
        e.constraint_name === "user_email_key")
    ) {
      return true;
    }
    e = e.cause as typeof e;
  }
  return false;
}

/**
 * 单事务注册：插 user（name=手机号、占位邮箱、agreement 留痕）+ credential
 * account（password 为 scrypt 摘要）。同号并发注册由 user_phone_number
 * 唯一索引裁决，后到事务在索引插入等待首事务提交后收到 23505。
 */
export async function registerWithPhone(input: {
  phone: string;
  password: string;
}): Promise<RegisterOutcome> {
  try {
    return await db.transaction(async (tx) => {
      const userId = crypto.randomUUID();
      await tx.insert(user).values({
        id: userId,
        name: input.phone,
        email: phoneToPlaceholderEmail(input.phone),
        phoneNumber: input.phone,
        agreementVersion: AGREEMENT_VERSION,
        agreedAt: new Date(),
      });
      await tx.insert(account).values({
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: await hashPassword(input.password),
      });
      return { ok: true, userId };
    });
  } catch (err) {
    if (isPhoneUniqueViolation(err)) {
      return { ok: false, error: "PHONE_ALREADY_REGISTERED" };
    }
    throw err;
  }
}
