/**
 * 契约切面单元测试:方向由请求方法推导(GET 归读、其余归写)决定兜底码,
 * 另覆盖会话三态、契约化错误(ApiError)透传与技术报错留痕。
 */
import { z } from "zod";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCurrentSession, type AuthSession } from "@/auth";
import { USERNAME_ALREADY_REGISTERED } from "@/auth/error";
import {
  respondWith,
  withSessionApiContract,
  withSessionlessApiContract,
} from "@/app/api/contract";
import { API_ERROR, ApiError } from "@/common/error";
import { logger } from "@/common/logger";

vi.mock("@/auth", () => ({ getCurrentSession: vi.fn() }));
vi.mock("@/common/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const session: AuthSession = {
  user: { id: "user-1", name: "tester", username: "tester" },
  session: {
    id: "sess-1",
    userId: "user-1",
    expiresAt: new Date("2027-01-01T00:00:00Z"),
  },
};

const readRequest = new Request("http://localhost/api/test", {
  method: "GET",
});
const writeRequest = new Request("http://localhost/api/test", {
  method: "POST",
});

const schema = z.object({ name: z.string() });

beforeEach(() => {
  vi.mocked(getCurrentSession).mockReset();
  vi.mocked(logger.error).mockClear();
});

describe("withSessionApiContract 会话守卫", () => {
  it("无会话 → 未授权(UNAUTHORIZED),不留痕", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);
    const result = await withSessionApiContract(
      writeRequest,
      null,
      z.any(),
      async () => undefined,
    );
    expect(result).toEqual({ ok: false, error: API_ERROR.UNAUTHORIZED });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("会话查询异常 + GET → 加载失败(LOAD_FAILED)并留痕", async () => {
    vi.mocked(getCurrentSession).mockRejectedValue(new Error("redis down"));
    const result = await withSessionApiContract(
      readRequest,
      null,
      z.any(),
      async () => undefined,
    );
    expect(result).toEqual({ ok: false, error: API_ERROR.LOAD_FAILED });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ direction: "read", stage: "session" }),
      expect.any(String),
    );
  });

  it("会话查询异常 + POST → 保存失败(SAVE_FAILED)并留痕", async () => {
    vi.mocked(getCurrentSession).mockRejectedValue(new Error("redis down"));
    const result = await withSessionApiContract(
      writeRequest,
      null,
      z.any(),
      async () => undefined,
    );
    expect(result).toEqual({ ok: false, error: API_ERROR.SAVE_FAILED });
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it("会话正常:userId 注入业务操作", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(session);
    let receivedUserId: string | undefined;
    await withSessionApiContract(readRequest, null, z.any(), async (userId) => {
      receivedUserId = userId;
    });
    expect(receivedUserId).toBe("user-1");
  });
});

describe("契约内核:复验与错误翻译", () => {
  it("入参未过 schema → 输入无效(INVALID_INPUT)并携带字段级错误", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(session);
    const result = await withSessionApiContract(
      readRequest,
      { name: 1 },
      schema,
      async () => undefined,
    );
    expect(result).toEqual({
      ok: false,
      error: API_ERROR.INVALID_INPUT,
      fieldErrors: { name: expect.any(String) },
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("契约化错误(ApiError)按码透传,不留痕", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(session);
    const result = await withSessionApiContract(
      writeRequest,
      null,
      z.any(),
      async () => {
        throw new ApiError(API_ERROR.NOT_FOUND);
      },
    );
    expect(result).toEqual({ ok: false, error: API_ERROR.NOT_FOUND });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("GET 未预期异常 → 加载失败(LOAD_FAILED)并留痕", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(session);
    const result = await withSessionApiContract(
      readRequest,
      null,
      z.any(),
      async () => {
        throw new Error("db exploded");
      },
    );
    expect(result).toEqual({ ok: false, error: API_ERROR.LOAD_FAILED });
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it("POST 未预期异常 → 保存失败(SAVE_FAILED)并留痕", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(session);
    const result = await withSessionApiContract(
      writeRequest,
      null,
      z.any(),
      async () => {
        throw new Error("db exploded");
      },
    );
    expect(result).toEqual({ ok: false, error: API_ERROR.SAVE_FAILED });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ direction: "write", stage: "operation" }),
      expect.any(String),
    );
  });
});

describe("respondWith 状态映射", () => {
  it("加载失败(LOAD_FAILED)→ 500", () => {
    const response = respondWith({ ok: false, error: API_ERROR.LOAD_FAILED });
    expect(response.status).toBe(500);
  });

  it("域码账户名已注册(USERNAME_ALREADY_REGISTERED)→ 409", () => {
    const response = respondWith({
      ok: false,
      error: USERNAME_ALREADY_REGISTERED,
    });
    expect(response.status).toBe(409);
  });
});

describe("withSessionlessApiContract 公开端点", () => {
  it("同一内核:未预期异常按方法归一并留痕", async () => {
    const result = await withSessionlessApiContract(
      writeRequest,
      null,
      z.any(),
      async () => {
        throw new Error("boom");
      },
    );
    expect(result).toEqual({ ok: false, error: API_ERROR.SAVE_FAILED });
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
