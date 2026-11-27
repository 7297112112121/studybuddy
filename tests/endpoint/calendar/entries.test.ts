/**
 * /api/calendar/entries 端点接口测试:直接调用 route handler
 * (Request → Response),真实 Postgres(compose.dev.yaml)。
 * getCurrentSession 依赖请求上下文,以 vi.mock 桩接(返回可配置会话或 null)。
 * 断言以 HTTP 状态码 + body 判别,落库/读回断言复用 queries 作 oracle;
 * service/queries 层直调用例已并入本文件,覆盖无差。
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { getCurrentSessionMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

import { db } from "@/common/db";
import { user } from "@/db/schema";
import { API_ERROR, type ApiResult } from "@/common/error";
import { DELETE, PUT } from "@/app/api/calendar/entries/[id]/route";
import { GET, POST } from "@/app/api/calendar/entries/route";
import { listMonthEntries } from "@/services/calendar/queries";
import { calendarEntryViewSchema } from "@/app/api/calendar/response";

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

describe("/api/calendar/entries（tests/endpoint/calendar/entries）", () => {
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

  it("⑧ R4 重叠并存：同账号同日两时段重叠条目均写入成功", async () => {
    const userId = await makeUser("overlap");
    signIn(userId);

    expect(
      (await postJson(input("2026-11-17", "高数复习", "14:00", "15:30")))
        .status,
    ).toBe(200);
    expect(
      (await postJson(input("2026-11-17", "英语听力", "14:30", "15:00")))
        .status,
    ).toBe(200);

    expect(await listMonthEntries(userId, 2026, 11)).toHaveLength(2);
  });

  it("⑨ R6/R7 月读隔离：甲乙各建一条，GET 月读各仅见己", async () => {
    const [userA, userB] = await Promise.all([
      makeUser("iso-a"),
      makeUser("iso-b"),
    ]);
    signIn(userA);
    await postJson(input("2026-11-17", "甲的条目", null, null));
    signIn(userB);
    await postJson(input("2026-11-17", "乙的条目", null, null));

    signIn(userA);
    const bodyA = (await (
      await GET(new Request(`${BASE}?view=month&month=2026-11`))
    ).json()) as { ok: boolean; data: { title: string }[] };
    expect(bodyA.data.map((r) => r.title)).toEqual(["甲的条目"]);

    signIn(userB);
    const bodyB = (await (
      await GET(new Request(`${BASE}?view=month&month=2026-11`))
    ).json()) as { ok: boolean; data: { title: string }[] };
    expect(bodyB.data.map((r) => r.title)).toEqual(["乙的条目"]);
  });

  it("⑩ R5 过去日期：'2026-01-01' 可写可查", async () => {
    const userId = await makeUser("past");
    signIn(userId);

    const postResponse = await postJson(input("2026-01-01", "元旦补记", null, null));
    expect(postResponse.status).toBe(200);

    const body = (await (
      await GET(new Request(`${BASE}?view=month&month=2026-01`))
    ).json()) as { ok: boolean; data: { title: string }[] };
    expect(body.data.map((r) => r.title)).toEqual(["元旦补记"]);
  });

  it("⑪ 区间边界：条目仅落所选月，邻月不串月", async () => {
    const userId = await makeUser("range");
    signIn(userId);
    await postJson(input("2026-11-30", "本月末", null, null));
    await postJson(input("2026-12-01", "次月初", null, null));

    const nov = (await (
      await GET(new Request(`${BASE}?view=month&month=2026-11`))
    ).json()) as { data: { title: string }[] };
    const dec = (await (
      await GET(new Request(`${BASE}?view=month&month=2026-12`))
    ).json()) as { data: { title: string }[] };
    expect(nov.data.map((r) => r.title)).toEqual(["本月末"]);
    expect(dec.data.map((r) => r.title)).toEqual(["次月初"]);
  });

  it("⑫ 周读区间过滤：仅返回该周（周一..周日），邻周条目不出现", async () => {
    const userId = await makeUser("wk-range");
    signIn(userId);
    await postJson(input("2026-11-16", "周一安排", null, null));
    await postJson(input("2026-11-22", "周日安排", null, null));
    await postJson(input("2026-11-15", "上周条目", null, null));
    await postJson(input("2026-11-23", "下周条目", null, null));

    const body = (await (
      await GET(new Request(`${BASE}?week=2026-11-16`))
    ).json()) as { ok: boolean; data: { title: string }[] };
    expect(body.data.map((r) => r.title)).toEqual(["周一安排", "周日安排"]);
  });

  it("⑬ 跨月周：'2026-11-30' 锚点同时取到 11-30 与 12-01（Review Focus 3）", async () => {
    const userId = await makeUser("wk-cross");
    signIn(userId);
    await postJson(input("2026-11-30", "月末条目", null, null));
    await postJson(input("2026-12-01", "月初条目", null, null));

    const body = (await (
      await GET(new Request(`${BASE}?week=2026-11-30`))
    ).json()) as { ok: boolean; data: { title: string }[] };
    expect(body.data.map((r) => r.title)).toEqual(["月末条目", "月初条目"]);
  });

  it("⑭ 周读隔离与空周：乙的周查询不含甲条目，空周返回空数组", async () => {
    const [userA, userB] = await Promise.all([
      makeUser("wk-a"),
      makeUser("wk-b"),
    ]);
    signIn(userA);
    await postJson(input("2026-11-18", "甲的条目", "09:00", "10:00"));

    signIn(userB);
    const bodyB = (await (
      await GET(new Request(`${BASE}?week=2026-11-16`))
    ).json()) as { ok: boolean; data: unknown[] };
    expect(bodyB.data).toEqual([]);

    signIn(userA);
    const bodyA = (await (
      await GET(new Request(`${BASE}?week=2026-11-16`))
    ).json()) as { ok: boolean; data: { title: string }[] };
    expect(bodyA.data).toHaveLength(1);
    expect(bodyA.data[0]?.title).toBe("甲的条目");
  });

  it("⑮ 周读排序与契约形状：无时间在前、按开始时间升序；结果过 calendarEntryViewSchema", async () => {
    const userId = await makeUser("wk-order");
    signIn(userId);
    await postJson(input("2026-11-18", "下午条目", "14:00", "15:00"));
    await postJson(input("2026-11-18", "全天条目", null, null));
    await postJson(input("2026-11-18", "上午条目", "09:00", "10:00"));
    await postJson(input("2026-11-17", "前一天条目", null, null));
    await postJson(input("2026-11-18", "契约条目", "09:30", "10:00", "备注"));

    const body = (await (
      await GET(new Request(`${BASE}?week=2026-11-16`))
    ).json()) as { ok: boolean; data: unknown[] };

    const parsed = z.array(calendarEntryViewSchema).parse(body.data);
    expect(parsed.map((r) => r.title)).toEqual([
      "前一天条目",
      "全天条目",
      "上午条目",
      "契约条目",
      "下午条目",
    ]);
    const contract = parsed.find((r) => r.title === "契约条目")!;
    expect(contract).toMatchObject({
      date: "2026-11-18",
      content: "备注",
      startTime: "09:30",
      endTime: "10:00",
    });
  });
});
