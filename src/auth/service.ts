/**
 * 认证技术层写路径 service（design「modules/auth/service.ts」契约，目录已
 * 归位至 src/auth/）。
 */
import { hashPassword } from "better-auth/crypto";

import { ApiError } from "@/common/error";
import { db } from "@/db/client";
import { account, user } from "@/db/schema";

import { USERNAME_ALREADY_REGISTERED } from "./error";

export function usernameToPlaceholderEmail(username: string): string {
  return `${username}@user.styb.invalid`;
}

/** 注册账户名与占位邮箱(单事务两行写入);账户名唯一冲突(23505)抛契约化错误(ApiError),其余 DB 异常向上抛由切面归一。 */
export async function registerWithUsername(input: {
  username: string;
  password: string;
}): Promise<void> {
  try {
    return await db.transaction(async (tx) => {
      const userId = crypto.randomUUID();
      await tx.insert(user).values({
        id: userId,
        name: input.username,
        email: usernameToPlaceholderEmail(input.username),
        username: input.username,
        agreementVersion: "v1",
        agreedAt: new Date(),
      });
      await tx.insert(account).values({
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: await hashPassword(input.password),
      });
    });
  } catch (err) {
    if (isUsernameUniqueViolation(err)) {
      throw new ApiError(USERNAME_ALREADY_REGISTERED);
    }
    throw err;
  }
}

function isUsernameUniqueViolation(err: unknown): boolean {
  let e = err as
    | {
        code?: string;
        constraint_name?: string;
        cause?: unknown;
      }
    | null
    | undefined;
  while (e) {
    if (
      e.code === "23505" &&
      (e.constraint_name === "user_username" ||
        e.constraint_name === "user_email_key")
    ) {
      return true;
    }
    e = e.cause as typeof e;
  }
  return false;
}
