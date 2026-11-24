import { describe, expect, it } from "vitest";
import { ROUTES } from "@/common/routes";

describe("ROUTES 路由常量（边界 #7）", () => {
  it("四个路径与 design 契约一致（calendar 为 AXY-22 新增）", () => {
    expect(ROUTES).toEqual({
      login: "/login",
      register: "/register",
      workbench: "/workbench",
      calendar: "/calendar",
    });
  });
});
