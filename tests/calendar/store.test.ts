/**
 * useCalendarStore 读域单测:竞态守卫(过期响应整体丢弃)、失败归一与
 * 失败重试。fetch 经 vi.stubGlobal 桩接;store 为模块单例,每例前重置状态。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERROR } from "@/common/error";
import type { CalendarEntryView } from "@/modules/calendar/queries";
import { useCalendarStore } from "@/stores/calendar";

function entry(id: string): CalendarEntryView {
  return {
    id,
    date: "2026-11-18",
    title: `事项${id}`,
    content: null,
    startTime: "09:00",
    endTime: null,
  };
}

function okBody(data: CalendarEntryView[]) {
  return { ok: true, data };
}

function errorBody(error: string) {
  return { ok: false, error };
}

/** 已决响应桩:store 只消费 response.json()。 */
function responseOf(body: unknown) {
  return { json: async () => body };
}

/** 手工控阀的响应:json() 返回未决 promise,测试按序放行以构造乱序到达。 */
function deferredBody() {
  let resolve!: (body: unknown) => void;
  const json = new Promise<unknown>((res) => {
    resolve = res;
  });
  return { json: () => json, resolve };
}

const initialState = {
  entries: [],
  todayEntries: [],
  todayScope: null,
  loadError: null,
  scope: null,
};

beforeEach(() => {
  useCalendarStore.setState({ ...initialState });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useCalendarStore load 竞态守卫", () => {
  it("快速翻周:前序响应后到,不覆盖新读域", async () => {
    const weekA = deferredBody();
    const weekB = deferredBody();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValueOnce(weekA).mockReturnValueOnce(weekB),
    );

    const loadA = useCalendarStore.getState().load("2026-11-16");
    const loadB = useCalendarStore.getState().load("2026-11-23");

    weekB.resolve(okBody([entry("b1")]));
    await loadB;
    expect(useCalendarStore.getState().entries).toEqual([entry("b1")]);

    weekA.resolve(okBody([entry("a1")]));
    await loadA;
    expect(useCalendarStore.getState().entries).toEqual([entry("b1")]);
    expect(useCalendarStore.getState().scope).toBe("2026-11-23");
    expect(useCalendarStore.getState().loadError).toBeNull();
  });

  it("前序异常后到(fetch reject),丢弃且不误置失败态不留痕", async () => {
    const weekA = deferredBody();
    const weekB = deferredBody();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValueOnce(weekA).mockReturnValueOnce(weekB),
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const loadA = useCalendarStore.getState().load("2026-11-16");
    const loadB = useCalendarStore.getState().load("2026-11-23");

    weekB.resolve(okBody([entry("b1")]));
    await loadB;
    weekA.resolve(Promise.reject(new TypeError("network down")));
    await loadA;

    expect(useCalendarStore.getState().entries).toEqual([entry("b1")]);
    expect(useCalendarStore.getState().loadError).toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("useCalendarStore load 失败归一", () => {
  it("读兜底码归一 NETWORK、未授权(UNAUTHORIZED)单列;成功清位", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(responseOf(errorBody(API_ERROR.LOAD_FAILED))),
    );
    await useCalendarStore.getState().load("2026-11-16");
    expect(useCalendarStore.getState().loadError).toBe("NETWORK");
    expect(useCalendarStore.getState().entries).toEqual([]);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(responseOf(errorBody(API_ERROR.UNAUTHORIZED))),
    );
    await useCalendarStore.getState().load("2026-11-16");
    expect(useCalendarStore.getState().loadError).toBe("UNAUTHORIZED");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(responseOf(okBody([entry("a1")]))),
    );
    await useCalendarStore.getState().load("2026-11-16");
    expect(useCalendarStore.getState().loadError).toBeNull();
    expect(useCalendarStore.getState().entries).toEqual([entry("a1")]);
  });

  it("fetch reject 归一 NETWORK 并留痕", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("network down")),
    );

    await useCalendarStore.getState().load("2026-11-16");

    expect(useCalendarStore.getState().loadError).toBe("NETWORK");
    expect(useCalendarStore.getState().entries).toEqual([]);
    expect(errorSpy).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });
});

describe("useCalendarStore loadToday 竞态守卫", () => {
  it("前序响应后到,不覆盖今日读域", async () => {
    const todayA = deferredBody();
    const todayB = deferredBody();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValueOnce(todayA).mockReturnValueOnce(todayB),
    );

    const loadA = useCalendarStore.getState().loadToday("2026-11-16");
    const loadB = useCalendarStore.getState().loadToday("2026-11-23");

    todayB.resolve(okBody([entry("b1")]));
    await loadB;
    expect(useCalendarStore.getState().todayEntries).toEqual([entry("b1")]);

    todayA.resolve(okBody([entry("a1")]));
    await loadA;
    expect(useCalendarStore.getState().todayEntries).toEqual([entry("b1")]);
    expect(useCalendarStore.getState().todayScope).toBe("2026-11-23");
  });
});

describe("useCalendarStore resync 失败重试", () => {
  it("按当前 scope 重载,成功后清失败态", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(responseOf(errorBody(API_ERROR.LOAD_FAILED)))
        .mockResolvedValueOnce(responseOf(okBody([entry("a1")]))),
    );

    await useCalendarStore.getState().load("2026-11-16");
    expect(useCalendarStore.getState().loadError).toBe("NETWORK");

    await useCalendarStore.getState().resync();
    expect(useCalendarStore.getState().loadError).toBeNull();
    expect(useCalendarStore.getState().entries).toEqual([entry("a1")]);
    expect(useCalendarStore.getState().scope).toBe("2026-11-16");
  });
});
