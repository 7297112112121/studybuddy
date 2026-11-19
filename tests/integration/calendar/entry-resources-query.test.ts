/**
 * T7 red 阶段:listEntryResources 集成测试(真实 Postgres)。
 * 断言:按 entryId 分组、仅本人条目资料(账号隔离传导)、空 dates 空 Map。
 */
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/db/client";
import { calendarEntry, entryResource, user } from "@/db/schema";
import { listEntryResources } from "@/modules/calendar/queries";

afterAll(async () => {
  await db.$client.end();
});

async function makeUser(tag: string): Promise<string> {
  const id = `axy24-res-${tag}-${crypto.randomUUID().slice(0, 8)}`;
  await db.insert(user).values({
    id,
    name: id,
    email: `${id}@axy24.invalid`,
    username: id,
    agreementVersion: "v1",
    agreedAt: new Date(),
  });
  return id;
}

async function makeEntry(
  userId: string,
  entryDate: string,
  title: string,
): Promise<string> {
  const [row] = await db
    .insert(calendarEntry)
    .values({ userId, entryDate, title })
    .returning({ id: calendarEntry.id });
  return row.id;
}

async function makeResource(
  entryId: string,
  title: string,
  url: string,
): Promise<void> {
  await db.insert(entryResource).values({ entryId, title, url });
}

describe("listEntryResources(AXY-24 T7)", () => {
  it("按 entryId 分组返回本人条目资料;他人条目资料不出现", async () => {
    const u1 = await makeUser("own");
    const u2 = await makeUser("other");
    const e1 = await makeEntry(u1, "2026-11-20", "学习next框架");
    const e2 = await makeEntry(u2, "2026-11-20", "别人的条目");
    await makeResource(e1, "官方文档", "https://nextjs.org/docs");
    await makeResource(e1, "Learn 课程", "https://nextjs.org/learn");
    await makeResource(e2, "别人的资料", "https://example.com/other");

    const map = await listEntryResources(u1, ["2026-11-20"]);

    expect(map.get(e1)).toEqual([
      { title: "官方文档", url: "https://nextjs.org/docs" },
      { title: "Learn 课程", url: "https://nextjs.org/learn" },
    ]);
    expect(map.has(e2)).toBe(false);
  });

  it("无资料条目不出现在 Map;空 dates 返回空 Map", async () => {
    const u1 = await makeUser("empty");
    await makeEntry(u1, "2026-11-21", "没有资料的条目");

    const map = await listEntryResources(u1, ["2026-11-21"]);
    expect(map.size).toBe(0);

    expect((await listEntryResources(u1, [])).size).toBe(0);
  });
});
