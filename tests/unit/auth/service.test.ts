/**
 * 认证技术层写路径 service 单测(src/auth/service.ts):唯一约束冲突的
 * 异因归因——user_username / user_email_key 约束(含 cause 链迭代)归一为
 * USERNAME_ALREADY_REGISTERED,其余 DB 异常原样上抛。事务经
 * vi.mock("@/common/db") 桩接(相邻下一层,先例同 services 单测);
 * 真依赖注册链路归接口轨直调承接。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/common/db";
import { USER_EMAIL_UNIQUE_NAME, USER_USERNAME_INDEX_NAME } from "@/db/schema";
import {
  PG_UNIQUE_VIOLATION_CODE,
  USERNAME_ALREADY_REGISTERED,
} from "@/auth/error";
import { registerWithUsername } from "@/auth/service";

vi.mock("@/common/db", () => ({
  db: { transaction: vi.fn() },
}));

const transactionMock = vi.mocked(db.transaction);

const input = { username: "alice", password: "Str0ng!pass" };

beforeEach(() => {
  transactionMock.mockReset();
});

describe("registerWithUsername:事务成功透传", () => {
  it("事务正常完成 → 原样完成,不包契约化错误", async () => {
    transactionMock.mockResolvedValue(undefined);

    await expect(registerWithUsername(input)).resolves.toBeUndefined();
  });
});

describe("registerWithUsername:唯一约束冲突归因", () => {
  it("user_username 约束冲突(23505)→ 拒约 USERNAME_ALREADY_REGISTERED", async () => {
    transactionMock.mockRejectedValue({
      code: PG_UNIQUE_VIOLATION_CODE,
      constraint_name: USER_USERNAME_INDEX_NAME,
    });

    await expect(registerWithUsername(input)).rejects.toMatchObject({
      code: USERNAME_ALREADY_REGISTERED,
    });
  });

  it("user_email_key 约束冲突(23505)→ 同拒约 USERNAME_ALREADY_REGISTERED", async () => {
    transactionMock.mockRejectedValue({
      code: PG_UNIQUE_VIOLATION_CODE,
      constraint_name: USER_EMAIL_UNIQUE_NAME,
    });

    await expect(registerWithUsername(input)).rejects.toMatchObject({
      code: USERNAME_ALREADY_REGISTERED,
    });
  });

  it("23505 但约束无关(sessions_pk)→ 原 error 同引用上抛", async () => {
    const original = Object.assign(new Error("duplicate key"), {
      code: PG_UNIQUE_VIOLATION_CODE,
      constraint_name: "sessions_pk",
    });
    transactionMock.mockRejectedValue(original);

    await expect(registerWithUsername(input)).rejects.toBe(original);
  });

  it("非 23505 错误码(42601)→ 原 error 同引用上抛", async () => {
    const original = Object.assign(new Error("syntax error"), {
      code: "42601",
      constraint_name: USER_USERNAME_INDEX_NAME,
    });
    transactionMock.mockRejectedValue(original);

    await expect(registerWithUsername(input)).rejects.toBe(original);
  });

  it("cause 链深层命中(外层 42601,cause 为 user_username 冲突)→ 拒约 USERNAME_ALREADY_REGISTERED", async () => {
    transactionMock.mockRejectedValue({
      code: "42601",
      cause: {
        code: PG_UNIQUE_VIOLATION_CODE,
        constraint_name: USER_USERNAME_INDEX_NAME,
      },
    });

    await expect(registerWithUsername(input)).rejects.toMatchObject({
      code: USERNAME_ALREADY_REGISTERED,
    });
  });
});
