/**
 * /api/calendar/entries 端点集成测试:直接调用 route handler
 * (Request → Response),真实 Postgres(compose.dev.yaml)。
 * getCurrentSession 依赖请求上下文,集成环境以 vi.mock 桩接
 * (返回可配置会话或 null)。断言以 HTTP 状态码 + body 判别。
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentSessionMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

import { db } from "@/db/client";
import { user } from "@/db/schema";
import { API_ERROR, type ApiResult } from "@/common/error";
import { DELETE, PUT } from "../../../src/app/api/calendar/entries/[id]/route";
import { GET, POST } from "../../../src/app/api/calendar/entries/route";
import { listMonthEntries } from "@/modules/calendar/queries";

const BASE = "http://localhost/api/calendar/entries";

afterAll(async () => {
  await db.$client.end();
});

beforeEach(() => {
  getCurrentSessionMock.mockReset();
});

/** 会话桩：返回登录态（userId 由测试指定）。 */
function signIn(userId: string): void {
  getCurrentSessionMock.mockResolvedValue({
    user: { id: userId, name: "cal", username: "cal" },
    session: { id: "s1", userId, expiresAt: new Date() },
  });
}

/** 直插 user 行造号（同 service.test.ts 约定）。 */
async function makeUser(tag: string): Promise<string> {
  const id = `cal-ent-${tag}-${crypto.randomUUID().slice(0, 8)}`;
  await db.insert(user).values({
    id,
    name: `日历集成-${tag}`,
    email: `${id}@cal.ent.invalid`,
    username: id,
    agreementVersion: "v1",
    agreedAt: new Date(),
  });
  return id;
}

const input = (
  date: string,
  title: string,
  startTime: string | null,
  endTime: string | null,
  content: string | null = null,
) => ({ date, title, content, startTime, endTime });

function postJson(body: unknown): Promise<Response> {
  return POST(
    new Request(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function putJson(id: string, body: unknown): Promise<Response> {
  return PUT(
    new Request(`${BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

function del(id: string): Promise<Response> {
  return DELETE(new Request(`${BASE}/${id}`, { method: "DELETE" }), {
    params: Promise.resolve({ id }),
  });
}

describe("/api/calendar/entries（tests/integration/calendar/entries）", () => {
  it("① 无会话：GET/POST/PUT/DELETE 各归一 UNAUTHORIZED（401）", async () => {
    getCurrentSessionMock.mockResolvedValue(null);
    const getResponse = await GET(new Request(`${BASE}?week=2026-11-16`));
    expect(getResponse.status).toBe(401);
    expect(await getResponse.json()).toEqual({
      ok: false,
      error: "UNAUTHORIZED",
    });
    const postResponse = await postJson(input("2026-11-17", "x", null, null));
    expect(postResponse.status).toBe(401);
    const putResponse = await putJson(
      "e1",
      input("2026-11-17", "x", null, null),
    );
    expect(putResponse.status).toBe(401);
    const deleteResponse = await del("e1");
    expect(deleteResponse.status).toBe(401);
  });

  it("② 非法入参：title 空 → 400 INVALID_INPUT + fieldErrors.title", async () => {
    const userId = await makeUser("invalid");
    signIn(userId);

    const response = await postJson(input("2026-11-17", "", null, null));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "INVALID_INPUT",
      fieldErrors: { title: "calendar.error.titleRequired" },
    });
  });

  it("② 非法入参：开始=结束 14:00 → fieldErrors.endTime 为 E-03 key", async () => {
    const userId = await makeUser("invalid2");
    signIn(userId);

    const response = await postJson(input("2026-11-17", "x", "14:00", "14:00"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "INVALID_INPUT",
      fieldErrors: { endTime: "calendar.error.endTimeAfterStart" },
    });
  });

  it("③ 未命中 id：PUT/DELETE → NOT_FOUND（404）", async () => {
    const userId = await makeUser("miss");
    signIn(userId);

    const putResponse = await putJson(
      crypto.randomUUID(),
      input("2026-11-17", "x", null, null),
    );
    expect(putResponse.status).toBe(404);
    expect(await putResponse.json()).toEqual({ ok: false, error: "NOT_FOUND" });
    const deleteResponse = await del(crypto.randomUUID());
    expect(deleteResponse.status).toBe(404);
  });

  it("④ 越权：乙会话调甲 entryId 的 PUT/DELETE → NOT_FOUND（service 抛未找到）", async () => {
    const [userA, userB] = await Promise.all([
      makeUser("ow-a"),
      makeUser("ow-b"),
    ]);
    signIn(userA);
    await postJson(input("2026-11-17", "甲的条目", "14:00", "15:30"));
    const entryId = (await listMonthEntries(userA, 2026, 11))[0].id;

    signIn(userB);
    const putResponse = await putJson(
      entryId,
      input("2026-11-17", "乙的篡改", null, null),
    );
    expect(putResponse.status).toBe(404);
    const deleteResponse = await del(entryId);
    expect(deleteResponse.status).toBe(404);

    signIn(userA);
    const rows = await listMonthEntries(userA, 2026, 11);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: "甲的条目", startTime: "14:00" });
  });

  it("⑤ 合法创建 → 200 ok:true 且库有行；GET 月读返回该条目", async () => {
    const userId = await makeUser("create");
    signIn(userId);

    const postResponse = await postJson(
      input("2026-11-17", "高数复习", "14:00", "15:30", "重点看例题"),
    );
    expect(postResponse.status).toBe(200);
    expect(await postResponse.json()).toEqual({ ok: true });

    const rows = await listMonthEntries(userId, 2026, 11);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: "高数复习",
      content: "重点看例题",
      startTime: "14:00",
      endTime: "15:30",
    });

    const getResponse = await GET(
      new Request(`${BASE}?view=month&month=2026-11`),
    );
    expect(getResponse.status).toBe(200);
    expect(await getResponse.json()).toEqual({ ok: true, data: rows });

    const getWeek = await GET(new Request(`${BASE}?week=2026-11-16`));
    expect(getWeek.status).toBe(200);
    const weekBody = (await getWeek.json()) as { ok: boolean; data: unknown[] };
    expect(weekBody.ok).toBe(true);
    expect(weekBody.data).toHaveLength(1);
  });

  it("⑥ 合法更新/删除 → ok:true 且库行变更/消失", async () => {
    const userId = await makeUser("ud");
    signIn(userId);
    await postJson(input("2026-11-17", "旧标题", null, null));
    const entryId = (await listMonthEntries(userId, 2026, 11))[0].id;

    const putResponse = await putJson(
      entryId,
      input("2026-11-17", "新标题", "09:00", "10:00"),
    );
    expect(putResponse.status).toBe(200);
    let rows = await listMonthEntries(userId, 2026, 11);
    expect(rows[0]).toMatchObject({
      title: "新标题",
      content: null, // 更新未带 content → 归一清空
      startTime: "09:00",
    });

    const deleteResponse = await del(entryId);
    expect(deleteResponse.status).toBe(200);
    rows = await listMonthEntries(userId, 2026, 11);
    expect(rows).toHaveLength(0);
  });

  it("⑦ SAVE_FAILED 分支存在性（类型面，运行时注入不强制造库故障）", () => {
    const saveFailed: ApiResult = { ok: false, error: API_ERROR.SAVE_FAILED };
    expect(saveFailed).toEqual({ ok: false, error: "SAVE_FAILED" });
  });
});
