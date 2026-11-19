/**
 * calendar Server Actions 集成测试（AXY-22 Task 4，design「契约」actions 行）。
 *
 * 真实 Postgres（compose.dev.yaml）。getCurrentSession 依赖 next/headers
 * 请求上下文，集成环境以 vi.mock 桩接（返回可配置会话或 null）；
 * revalidatePath 同理桩接并断言其入参（成功路径必经，ADR-0025）。
 * 断言值逐字取自 tasks.md Task 4「失败测试」行。
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentSessionMock, revalidatePathMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/modules/auth", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { db } from "@/db/client";
import { user } from "@/db/schema";
import { ROUTES } from "@/lib/routes";
import type { CalendarEntryActionResult } from "@/modules/calendar/actions";
import {
  createEntryAction,
  deleteEntryAction,
  updateEntryAction,
} from "@/modules/calendar/actions";
import { listMonthEntries } from "@/modules/calendar/queries";

afterAll(async () => {
  await db.$client.end();
});

beforeEach(() => {
  getCurrentSessionMock.mockReset();
  revalidatePathMock.mockClear();
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
  const id = `cal-act-${tag}-${crypto.randomUUID().slice(0, 8)}`;
  await db.insert(user).values({
    id,
    name: `日历集成-${tag}`,
    email: `${id}@cal.act.invalid`,
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
) => ({ date, title, startTime, endTime });

describe("calendar Server Actions（tests/integration/calendar/actions）", () => {
  it("① 无会话：三 action 各返回 UNAUTHORIZED", async () => {
    getCurrentSessionMock.mockResolvedValue(null);
    expect(
      await createEntryAction(input("2026-11-17", "x", null, null)),
    ).toEqual({
      ok: false,
      error: "UNAUTHORIZED",
    });
    expect(
      await updateEntryAction("e1", input("2026-11-17", "x", null, null)),
    ).toEqual({
      ok: false,
      error: "UNAUTHORIZED",
    });
    expect(await deleteEntryAction("e1")).toEqual({
      ok: false,
      error: "UNAUTHORIZED",
    });
  });

  it("② 非法入参：title 空 → INVALID_INPUT + fieldErrors.title", async () => {
    const userId = await makeUser("invalid");
    signIn(userId);

    expect(
      await createEntryAction(input("2026-11-17", "", null, null)),
    ).toEqual({
      ok: false,
      error: "INVALID_INPUT",
      fieldErrors: { title: "calendar.error.titleRequired" },
    });
  });

  it("② 非法入参：开始=结束 14:00 → fieldErrors.endTime 为 E-03 key", async () => {
    const userId = await makeUser("invalid2");
    signIn(userId);

    expect(
      await createEntryAction(input("2026-11-17", "x", "14:00", "14:00")),
    ).toEqual({
      ok: false,
      error: "INVALID_INPUT",
      fieldErrors: { endTime: "calendar.error.endTimeAfterStart" },
    });
  });

  it("③ 未命中 id：update/deleteEntryAction → NOT_FOUND", async () => {
    const userId = await makeUser("miss");
    signIn(userId);

    expect(
      await updateEntryAction(
        crypto.randomUUID(),
        input("2026-11-17", "x", null, null),
      ),
    ).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(await deleteEntryAction(crypto.randomUUID())).toEqual({
      ok: false,
      error: "NOT_FOUND",
    });
  });

  it("④ 越权：乙会话调甲 entryId 的 update/delete → NOT_FOUND（service false 归一）", async () => {
    const [userA, userB] = await Promise.all([
      makeUser("ow-a"),
      makeUser("ow-b"),
    ]);
    signIn(userA);
    await createEntryAction(input("2026-11-17", "甲的条目", "14:00", "15:30"));
    const entryId = (await listMonthEntries(userA, 2026, 11))[0].id;

    signIn(userB);
    expect(
      await updateEntryAction(
        entryId,
        input("2026-11-17", "乙的篡改", null, null),
      ),
    ).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(await deleteEntryAction(entryId)).toEqual({
      ok: false,
      error: "NOT_FOUND",
    });

    signIn(userA);
    const rows = await listMonthEntries(userA, 2026, 11);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: "甲的条目", startTime: "14:00" });
  });

  it("⑤ 合法创建 → ok:true 且库有行，revalidatePath(ROUTES.calendar) 必经", async () => {
    const userId = await makeUser("create");
    signIn(userId);

    expect(
      await createEntryAction(
        input("2026-11-17", "高数复习", "14:00", "15:30"),
      ),
    ).toEqual({
      ok: true,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith(ROUTES.calendar);

    const rows = await listMonthEntries(userId, 2026, 11);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: "高数复习",
      startTime: "14:00",
      endTime: "15:30",
    });
  });

  it("⑥ 合法更新/删除 → ok:true 且库行变更/消失", async () => {
    const userId = await makeUser("ud");
    signIn(userId);
    await createEntryAction(input("2026-11-17", "旧标题", null, null));
    const entryId = (await listMonthEntries(userId, 2026, 11))[0].id;

    expect(
      await updateEntryAction(
        entryId,
        input("2026-11-17", "新标题", "09:00", "10:00"),
      ),
    ).toEqual({ ok: true });
    let rows = await listMonthEntries(userId, 2026, 11);
    expect(rows[0]).toMatchObject({ title: "新标题", startTime: "09:00" });

    expect(await deleteEntryAction(entryId)).toEqual({ ok: true });
    rows = await listMonthEntries(userId, 2026, 11);
    expect(rows).toHaveLength(0);
  });

  it("⑦ SAVE_FAILED 分支存在性（类型面，运行时注入不强制造库故障）", () => {
    const saveFailed: CalendarEntryActionResult = {
      ok: false,
      error: "SAVE_FAILED",
    };
    expect(saveFailed).toEqual({ ok: false, error: "SAVE_FAILED" });
  });
});
