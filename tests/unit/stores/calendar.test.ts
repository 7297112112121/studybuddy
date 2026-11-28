/**
 * 日历 store 读/写编排单测:竞态守卫(过期响应整体丢弃)、失败归一与
 * 失败重试。fetch 经 vi.stubGlobal 桩接;store 为模块单例,每例前重置状态。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERROR } from "@/common/error";
import type { CalendarEntryView } from "@/app/api/calendar/response";
import { useCalendarStore } from "@/stores/calendar";

/** 编排 action 为稳定引用,模块级解构一次(get 取态在调用时实时)。 */
const { load, loadToday, resync } = useCalendarStore.getState();

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

/** 已决响应桩:编排只消费 response.json()。 */
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
  loadError: false,
  scope: null,
};

beforeEach(() => {
  useCalendarStore.setState({ ...initialState });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("store load 竞态守卫", () => {
  it("快速翻周:前序响应后到,不覆盖新读域;新鲜结果原样返回、过期返回 null", async () => {
    const weekA = deferredBody();
    const weekB = deferredBody();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValueOnce(weekA).mockReturnValueOnce(weekB),
    );

    const loadA = load("2026-11-16");
    const loadB = load("2026-11-23");

    weekB.resolve(okBody([entry("b1")]));
    const resultB = await loadB;
    expect(resultB).toEqual(okBody([entry("b1")]));
    expect(useCalendarStore.getState().entries).toEqual([entry("b1")]);

    weekA.resolve(okBody([entry("a1")]));
    const resultA = await loadA;
    expect(resultA).toBeNull();
    expect(useCalendarStore.getState().entries).toEqual([entry("b1")]);
    expect(useCalendarStore.getState().scope).toBe("2026-11-23");
    expect(useCalendarStore.getState().loadError).toBe(false);
  });

  it("前序异常后到(fetch reject),丢弃且不误置失败态;留痕发生在请求封装归一点", async () => {
    const weekA = deferredBody();
    const weekB = deferredBody();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValueOnce(weekA).mockReturnValueOnce(weekB),
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const loadA = load("2026-11-16");
    const loadB = load("2026-11-23");

    weekB.resolve(okBody([entry("b1")]));
    await loadB;
    weekA.resolve(Promise.reject(new TypeError("network down")));
    await loadA;

    expect(useCalendarStore.getState().entries).toEqual([entry("b1")]);
    expect(useCalendarStore.getState().loadError).toBe(false);
    expect(errorSpy).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });
});

describe("store load 失败归一", () => {
  it("技术失败落失败态;未授权(UNAUTHORIZED)不落失败态、新鲜结果原样返回供调用侧分派;成功清位", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(responseOf(errorBody(API_ERROR.LOAD_FAILED))),
    );
    await load("2026-11-16");
    expect(useCalendarStore.getState().loadError).toBe(true);
    expect(useCalendarStore.getState().entries).toEqual([]);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(responseOf(errorBody(API_ERROR.UNAUTHORIZED))),
    );
    const unauthorized = await load("2026-11-16");
    expect(unauthorized).toEqual(errorBody(API_ERROR.UNAUTHORIZED));
    expect(useCalendarStore.getState().loadError).toBe(false);
    expect(useCalendarStore.getState().entries).toEqual([]);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(responseOf(okBody([entry("a1")]))),
    );
    await load("2026-11-16");
    expect(useCalendarStore.getState().loadError).toBe(false);
    expect(useCalendarStore.getState().entries).toEqual([entry("a1")]);
  });

  it("fetch reject 由请求封装归一为读兜底码并留痕", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("network down")),
    );

    const result = await load("2026-11-16");

    expect(result).toEqual(errorBody(API_ERROR.LOAD_FAILED));
    expect(useCalendarStore.getState().loadError).toBe(true);
    expect(useCalendarStore.getState().entries).toEqual([]);
    expect(errorSpy).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });
});

describe("store loadToday 竞态守卫", () => {
  it("前序响应后到,不覆盖今日读域", async () => {
    const todayA = deferredBody();
    const todayB = deferredBody();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValueOnce(todayA).mockReturnValueOnce(todayB),
    );

    const loadA = loadToday("2026-11-16");
    const loadB = loadToday("2026-11-23");

    todayB.resolve(okBody([entry("b1")]));
    await loadB;
    expect(useCalendarStore.getState().todayEntries).toEqual([entry("b1")]);

    todayA.resolve(okBody([entry("a1")]));
    await loadA;
    expect(useCalendarStore.getState().todayEntries).toEqual([entry("b1")]);
    expect(useCalendarStore.getState().todayScope).toBe("2026-11-23");
  });
});

describe("store loadToday 失败归一", () => {
  it("读取失败 → todayEntries 归一空数组", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(responseOf(errorBody(API_ERROR.LOAD_FAILED))),
    );

    await loadToday("2026-11-16");

    expect(useCalendarStore.getState().todayEntries).toEqual([]);
  });
});

describe("store resync 失败重试", () => {
  it("按当前 scope 重载,成功后清失败态", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(responseOf(errorBody(API_ERROR.LOAD_FAILED)))
        .mockResolvedValueOnce(responseOf(okBody([entry("a1")]))),
    );

    await load("2026-11-16");
    expect(useCalendarStore.getState().loadError).toBe(true);

    await resync();
    expect(useCalendarStore.getState().loadError).toBe(false);
    expect(useCalendarStore.getState().entries).toEqual([entry("a1")]);
    expect(useCalendarStore.getState().scope).toBe("2026-11-16");
  });
});
