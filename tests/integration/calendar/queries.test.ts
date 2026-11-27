/**
 * listWeekEntries 集成测试(真实 Postgres):周区间过滤(含跨月周)、
 * 账号隔离、空周空数组、排序口径与 listMonthEntries 一致。
 * 造号直插 user 行(与 service.test.ts 同款,不经 auth service)。
 */
import { afterAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { db } from "@/common/db";
import { user } from "@/db/schema";
import { createEntry } from "@/modules/calendar/service";
import { listWeekEntries } from "@/modules/calendar/queries";
import { calendarEntryViewSchema } from "@/validation/calendar-response";

afterAll(async () => {
  await db.$client.end();
});

/** 直插 user 行造号,返回 userId。 */
async function makeUser(tag: string): Promise<string> {
  const id = `cal-wk-${tag}-${crypto.randomUUID().slice(0, 8)}`;
  await db.insert(user).values({
    id,
    name: `周视图集成-${tag}`,
    email: `${id}@cal.wk.invalid`,
    username: id,
    agreementVersion: "v1",
    agreedAt: new Date(),
  });
  return id;
}

type Input = {
  date: string;
  title: string;
  content: string | null;
  startTime: string | null;
  endTime: string | null;
};

function input(
  date: string,
  title: string,
  startTime: string | null,
  endTime: string | null,
  content: string | null = null,
): Input {
  return { date, title, content, startTime, endTime };
}

describe("listWeekEntries(AXY-23 Task 4)", () => {
  it("周区间过滤:仅返回该周(周一..周日)条目,邻周条目不出现", async () => {
    const userId = await makeUser("range");
    await createEntry(userId, input("2026-11-16", "周一安排", null, null));
    await createEntry(userId, input("2026-11-22", "周日安排", null, null));
    await createEntry(userId, input("2026-11-15", "上周条目", null, null));
    await createEntry(userId, input("2026-11-23", "下周条目", null, null));

    const rows = await listWeekEntries(userId, "2026-11-16");
    expect(rows.map((r) => r.title)).toEqual(["周一安排", "周日安排"]);
  });

  it("跨月周:'2026-11-30' 锚点同时取到 11-30 与 12-01 条目(Review Focus 3)", async () => {
    const userId = await makeUser("crossmonth");
    await createEntry(userId, input("2026-11-30", "月末条目", null, null));
    await createEntry(userId, input("2026-12-01", "月初条目", null, null));

    const rows = await listWeekEntries(userId, "2026-11-30");
    expect(rows.map((r) => r.title)).toEqual(["月末条目", "月初条目"]);
  });

  it("R7 隔离:账号乙的周查询不含账号甲条目;空周返回空数组", async () => {
    const [userA, userB] = await Promise.all([
      makeUser("wk-a"),
      makeUser("wk-b"),
    ]);
    await createEntry(userA, input("2026-11-18", "甲的条目", "09:00", "10:00"));

    const rowsB = await listWeekEntries(userB, "2026-11-16");
    expect(rowsB).toEqual([]);

    const rowsA = await listWeekEntries(userA, "2026-11-16");
    expect(rowsA).toHaveLength(1);
    expect(rowsA[0]?.title).toBe("甲的条目");
  });

  it("排序口径与 listMonthEntries 一致:同日不带时间在前、带时间按开始时间升序", async () => {
    const userId = await makeUser("order");
    await createEntry(
      userId,
      input("2026-11-18", "下午条目", "14:00", "15:00"),
    );
    await createEntry(userId, input("2026-11-18", "全天条目", null, null));
    await createEntry(
      userId,
      input("2026-11-18", "上午条目", "09:00", "10:00"),
    );
    await createEntry(userId, input("2026-11-17", "前一天条目", null, null));

    const rows = await listWeekEntries(userId, "2026-11-16");
    expect(rows.map((r) => r.title)).toEqual([
      "前一天条目",
      "全天条目",
      "上午条目",
      "下午条目",
    ]);
  });

  it("产出形状对齐响应契约:查询结果过 calendarEntryViewSchema,时刻为 HH:MM", async () => {
    const userId = await makeUser("contract");
    await createEntry(
      userId,
      input("2026-11-18", "契约条目", "09:30", "10:00", "备注"),
    );

    const rows = await listWeekEntries(userId, "2026-11-16");
    const parsed = z.array(calendarEntryViewSchema).parse(rows);
    expect(parsed[0]).toMatchObject({
      date: "2026-11-18",
      title: "契约条目",
      content: "备注",
      startTime: "09:30",
      endTime: "10:00",
    });
  });
});
