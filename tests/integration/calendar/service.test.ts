/**
 * calendar 读写链路集成测试（AXY-22 Task 3，真实 Postgres）。
 *
 * 覆盖 design「契约」表 queries/service 行的错误情形与 proposal R4/R5/R6/R7：
 * 造号直插 user 行（不经 auth service，Zod/密码哈希与日历域无关）。
 * 断言值逐字取自 tasks.md Task 3「失败测试」行。
 */
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/db/client";
import { user } from "@/db/schema";
import {
  createEntry,
  deleteEntry,
  updateEntry,
} from "@/modules/calendar/service";
import { listMonthEntries } from "@/modules/calendar/queries";

afterAll(async () => {
  await db.$client.end();
});

/** 直插 user 行造号，返回 userId（列满足 user 表 notNull 集合）。 */
async function makeUser(tag: string): Promise<string> {
  const id = `cal-svc-${tag}-${crypto.randomUUID().slice(0, 8)}`;
  await db.insert(user).values({
    id,
    name: `日历集成-${tag}`,
    email: `${id}@cal.svc.invalid`,
    username: id,
    agreementVersion: "v1",
    agreedAt: new Date(),
  });
  return id;
}

/** 合法入参形态（已经 zod 校验的假定入参）。 */
function input(
  date: string,
  title: string,
  startTime: string | null,
  endTime: string | null,
) {
  return { date, title, startTime, endTime };
}

describe("calendar 读写链路（tests/integration/calendar/service）", () => {
  it("R4 重叠并存：同账号同日 14:00–15:30 与 14:30–15:00 两行均写入成功", async () => {
    const userId = await makeUser("overlap");
    await createEntry(
      userId,
      input("2026-11-17", "高数复习", "14:00", "15:30"),
    );
    await createEntry(
      userId,
      input("2026-11-17", "英语听力", "14:30", "15:00"),
    );

    const rows = await listMonthEntries(userId, 2026, 11);
    expect(rows).toHaveLength(2);
  });

  it("R6/R7 隔离：listMonthEntries 仅返回本人条目，甲乙互不可见", async () => {
    const [userA, userB] = await Promise.all([
      makeUser("iso-a"),
      makeUser("iso-b"),
    ]);
    await createEntry(userA, input("2026-11-17", "甲的条目", null, null));
    await createEntry(userB, input("2026-11-17", "乙的条目", null, null));

    const rowsA = await listMonthEntries(userA, 2026, 11);
    const rowsB = await listMonthEntries(userB, 2026, 11);
    expect(rowsA.map((r) => r.title)).toEqual(["甲的条目"]);
    expect(rowsB.map((r) => r.title)).toEqual(["乙的条目"]);
  });

  it("R7 越权写：以乙 userId 调 updateEntry/deleteEntry（甲的 entryId）→ false 且甲条目原样", async () => {
    const [userA, userB] = await Promise.all([
      makeUser("xw-a"),
      makeUser("xw-b"),
    ]);
    await createEntry(userA, input("2026-11-17", "甲的条目", "14:00", "15:30"));
    const entryId = (await listMonthEntries(userA, 2026, 11))[0].id;

    expect(
      await updateEntry(
        userB,
        entryId,
        input("2026-11-17", "乙的篡改", null, null),
      ),
    ).toBe(false);
    expect(await deleteEntry(userB, entryId)).toBe(false);

    const rowsA = await listMonthEntries(userA, 2026, 11);
    expect(rowsA).toHaveLength(1);
    expect(rowsA[0]).toMatchObject({
      id: entryId,
      title: "甲的条目",
      startTime: "14:00",
      endTime: "15:30",
    });
  });

  it("R5 过去日期：entryDate '2026-01-01' 可写可查", async () => {
    const userId = await makeUser("past");
    await createEntry(userId, input("2026-01-01", "元旦补记", null, null));

    const rows = await listMonthEntries(userId, 2026, 1);
    expect(rows.map((r) => r.title)).toEqual(["元旦补记"]);
  });

  it("排序：同日混排（无时间 + 14:30 + 09:00）→ 无时间行最前、其余 startTime 升序", async () => {
    const userId = await makeUser("sort");
    await createEntry(userId, input("2026-11-17", "散记", null, null));
    await createEntry(userId, input("2026-11-17", "下午场", "14:30", null));
    await createEntry(userId, input("2026-11-17", "上午场", "09:00", null));

    const rows = await listMonthEntries(userId, 2026, 11);
    expect(rows.map((r) => r.title)).toEqual(["散记", "上午场", "下午场"]);
  });

  it("视图形状：startTime/endTime 归一为 'HH:MM'（time 列秒位不泄漏，Review Focus #2）", async () => {
    const userId = await makeUser("shape");
    await createEntry(
      userId,
      input("2026-11-17", "高数复习", "14:00", "15:30"),
    );

    const rows = await listMonthEntries(userId, 2026, 11);
    expect(rows[0]).toMatchObject({ startTime: "14:00", endTime: "15:30" });
    expect(rows[0].startTime).not.toContain(":00:00");
  });

  it("区间边界：条目仅落所选月，邻月条目不串月", async () => {
    const userId = await makeUser("range");
    await createEntry(userId, input("2026-11-30", "本月末", null, null));
    await createEntry(userId, input("2026-12-01", "次月初", null, null));

    const nov = await listMonthEntries(userId, 2026, 11);
    const dec = await listMonthEntries(userId, 2026, 12);
    expect(nov.map((r) => r.title)).toEqual(["本月末"]);
    expect(dec.map((r) => r.title)).toEqual(["次月初"]);
  });

  it("updateEntry 正向路径：命中本人条目 → true 且库行变更", async () => {
    const userId = await makeUser("upd");
    await createEntry(userId, input("2026-11-17", "旧标题", "14:00", "15:30"));
    const entryId = (await listMonthEntries(userId, 2026, 11))[0].id;

    expect(
      await updateEntry(
        userId,
        entryId,
        input("2026-11-18", "新标题", "09:00", "10:00"),
      ),
    ).toBe(true);

    const rows = await listMonthEntries(userId, 2026, 11);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: entryId,
      date: "2026-11-18",
      title: "新标题",
      startTime: "09:00",
      endTime: "10:00",
    });
  });

  it("deleteEntry 正向路径：命中本人条目 → true 且行消失", async () => {
    const userId = await makeUser("del");
    await createEntry(userId, input("2026-11-17", "待删条目", null, null));
    const entryId = (await listMonthEntries(userId, 2026, 11))[0].id;

    expect(await deleteEntry(userId, entryId)).toBe(true);
    expect(await listMonthEntries(userId, 2026, 11)).toHaveLength(0);
    const left = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId));
    expect(left).toHaveLength(1); // 造号行仍在，仅条目被删
  });
});
