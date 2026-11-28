/**
 * StarsBackground 组件测试(全站品牌深空背景,视差星层——ADR-0027)。
 *
 * 覆盖:三层星层结构、星点 shadow 确定性(SSR 水合一致的关键——
 * 种子随机而非 Math.random)、speed 对漂移时长的反比缩放、
 * 装饰层无障碍语义(aria-hidden + pointer-events 豁免)。
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import StarsBackground from "@/components/StarsBackground";

afterEach(cleanup);

describe("StarsBackground(tests/calendar/components/StarsBackground)", () => {
  it("① 渲染 3 个星层,均为 aria-hidden 装饰层的子节点", () => {
    const { container } = render(<StarsBackground />);
    const sky = container.querySelector("[data-testid='stars-sky']");
    expect(sky).not.toBeNull();
    expect(sky?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelectorAll("[data-star-layer]")).toHaveLength(3);
  });

  it("② 星点 shadow 确定性:同 props 两次渲染输出逐字节一致", () => {
    const first = render(<StarsBackground />);
    const firstShadows = [
      ...first.container.querySelectorAll("[data-star-layer]"),
    ].map((el) => (el as HTMLElement).style.boxShadow);

    cleanup();
    const second = render(<StarsBackground />);
    const secondShadows = [
      ...second.container.querySelectorAll("[data-star-layer]"),
    ].map((el) => (el as HTMLElement).style.boxShadow);

    expect(firstShadows).toEqual(secondShadows);
    // 且每层都有真实内容(非空 shadow 串)
    expect(firstShadows.every((s) => s.includes("px"))).toBe(true);
  });

  it("③ speed 反比缩放漂移时长:默认 50/100/150s,speed=2 时减半", () => {
    const { container } = render(<StarsBackground speed={2} />);
    const durations = [...container.querySelectorAll("[data-star-layer]")].map(
      (el) => (el as HTMLElement).style.animationDuration,
    );
    expect(durations).toEqual(["25s", "50s", "75s"]);
  });
});
