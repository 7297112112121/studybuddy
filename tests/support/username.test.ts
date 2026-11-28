/**
 * 造号共享件符合性测试(单元测试纪律:对齐锁定,共享件生成规则以校验层导出成员为锚):
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

  it("连续 10 次调用互不重复（seq 计数器确定性保证）", () => {
    // 实现的真实契约:任意连续 10 次调用必不重复——同毫秒内 seq(0..9) 互异,
    // 跨毫秒则时间戳主干互异。更大批量 uniqueness 靠 4 位随机尾兜底,属概率
    // 保证,超出确定性断言范围(200 次批量断言有生日悖论撞率,CI 概率性红)。
    const names = Array.from({ length: 10 }, () => uniqueUsername());
    expect(new Set(names).size).toBe(10);
  });
});
