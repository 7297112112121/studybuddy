import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

/**
 * 冒烟测试：jsdom + RTL 渲染链路（ADR-0012 的客户端组件测试路径可用性）。
 * 组件文件内联，不改 src/ 业务代码。
 */
function Greeting({ name }: { name: string }) {
  return <h1>你好，{name}</h1>;
}

describe("冒烟：RTL 渲染内联组件", () => {
  afterEach(cleanup);

  it("渲染 h1 并断言可访问名", () => {
    render(<Greeting name="studybuddy" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "你好，studybuddy" }),
    ).toBeDefined();
  });
});
