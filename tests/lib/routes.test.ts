import { describe, expect, it } from "vitest";
import { ROUTES } from "@/lib/routes";

describe("ROUTES 路由常量（边界 #7）", () => {
  it("三个路径与 design 契约一致", () => {
    expect(ROUTES).toEqual({ login: "/login", register: "/register", workbench: "/workbench" });
  });
});
