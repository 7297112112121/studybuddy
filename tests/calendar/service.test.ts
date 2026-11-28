import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CalendarEntryInput } from "@/app/api/calendar/request";
import { db } from "@/common/db";
import { API_ERROR } from "@/common/error";

import {
  createEntry,
  deleteEntry,
  updateEntry,
} from "@/services/calendar/service";

/**
 * calendar 写路径 service 单测（归属单测轨）：桩接相邻层 @/common/db 后，
 * 证 values 字段映射与未命中守卫（NOT_FOUND）；落库真值归接口轨真依赖直调承接。
 */
vi.mock("@/common/db", () => ({
  db: { insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

const input: CalendarEntryInput = {
  date: "2026-11-17",
  title: "周会",
  content: null,
  startTime: "14:00",
  endTime: "15:00",
};

const insertMock = vi.mocked(db.insert);
const updateMock = vi.mocked(db.update);
const deleteMock = vi.mocked(db.delete);

/** 桩定 update 链：returning 恒返回给定行序。 */
function stubUpdateReturning(rows: { id: string }[]): void {
  updateMock.mockReturnValue({
    set: () => ({ where: () => ({ returning: () => Promise.resolve(rows) }) }),
  } as unknown as ReturnType<typeof db.update>);
}

/** 桩定 delete 链：returning 恒返回给定行序。 */
function stubDeleteReturning(rows: { id: string }[]): void {
  deleteMock.mockReturnValue({
    where: () => ({ returning: () => Promise.resolve(rows) }),
  } as unknown as ReturnType<typeof db.delete>);
}

beforeEach(() => {
  insertMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
});

describe("createEntry：INSERT 写入", () => {
  it("合法输入 → insert 收到 userId 与 date→entryDate 映射后的完整 values", async () => {
    const valuesMock = vi.fn().mockResolvedValue(undefined);
    insertMock.mockReturnValue({
      values: valuesMock,
    } as unknown as ReturnType<typeof db.insert>);
    await expect(createEntry("user-1", input)).resolves.toBeUndefined();
    expect(valuesMock).toHaveBeenCalledWith({
      userId: "user-1",
      entryDate: "2026-11-17",
      title: "周会",
      content: null,
      startTime: "14:00",
      endTime: "15:00",
    });
  });
});

describe("updateEntry：命中更新，未命中抛未找到", () => {
  it("returning 返回命中行 → 正常完成", async () => {
    stubUpdateReturning([{ id: "entry-1" }]);
    await expect(
      updateEntry("user-1", "entry-1", input),
    ).resolves.toBeUndefined();
  });

  it("returning 为空（不存在或不属于该用户）→ 拒约 NOT_FOUND", async () => {
    stubUpdateReturning([]);
    await expect(updateEntry("user-1", "entry-1", input)).rejects.toMatchObject(
      { code: API_ERROR.NOT_FOUND },
    );
  });
});

describe("deleteEntry：命中删除，未命中抛未找到", () => {
  it("returning 返回命中行 → 正常完成", async () => {
    stubDeleteReturning([{ id: "entry-1" }]);
    await expect(deleteEntry("user-1", "entry-1")).resolves.toBeUndefined();
  });

  it("returning 为空（不存在或不属于该用户）→ 拒约 NOT_FOUND", async () => {
    stubDeleteReturning([]);
    await expect(deleteEntry("user-1", "entry-1")).rejects.toMatchObject({
      code: API_ERROR.NOT_FOUND,
    });
  });
});
