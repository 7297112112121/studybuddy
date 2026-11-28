/**
 * 技术报错兜底码与呈现文案键的对齐锁定:两个兜底码(保存失败
 * SAVE_FAILED / 加载失败 LOAD_FAILED)的通用文案必须存在于消费它的命名空间。
 */
import { describe, expect, it } from "vitest";

import calendar from "@/locales/zh-CN/calendar.json";
import workbench from "@/locales/zh-CN/workbench.json";

describe("兜底码文案键对齐", () => {
  it("保存失败(SAVE_FAILED)的表单文案键存在", () => {
    expect(calendar.error.saveFailed).toBe("保存失败,请重试");
  });

  it("加载失败(LOAD_FAILED)的读失败文案键存在", () => {
    expect(calendar.week.loadFailed).toBe("加载失败,请重试");
    expect(workbench.error.loadFailed).toBe("加载失败,请重试");
    expect(workbench.error.retry).toBe("重试");
  });
});
