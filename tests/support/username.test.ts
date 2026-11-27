/**
 * 造号共享件符合性测试(测试纪律:共享件生成规则以校验层导出成员为锚):
 * 产出一律过 USERNAME_RE(含 uppercase 合法变体)且互不重复,规则漂移时
 * 此测试先红,而非集成/E2E 在真库撞唯一索引时红。
 */
import { describe, expect, it } from "vitest";

import { USERNAME_MAX_LENGTH, USERNAME_RE } from "@/validation/auth";

import { uniqueUsername } from "./username";

describe("uniqueUsername 符合性", () => {
  it("批量产出全部过 USERNAME_RE 且长度不超上界(含 uppercase 变体)", () => {
    const names = Array.from({ length: 200 }, () => uniqueUsername());
    for (const name of names) {
      expect(name.length).toBeLessThanOrEqual(USERNAME_MAX_LENGTH);
      expect(USERNAME_RE.test(name)).toBe(true);
      expect(USERNAME_RE.test(name.toUpperCase())).toBe(true);
    }
  });

  it("批量产出互不重复", () => {
    const names = new Set(Array.from({ length: 200 }, () => uniqueUsername()));
    expect(names.size).toBe(200);
  });
});
