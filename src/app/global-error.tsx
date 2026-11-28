"use client";

/**
 * 根布局渲染失败兜底:激活时整体替换根布局,须自带 html/body 文档骨架,
 * 全局样式与 i18n Provider 均不在挂载树内,文案直写中文,样式用内联。
 */
import { useEffect } from "react";

export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>
            出了点问题,请稍后再试
          </p>
          <button
            type="button"
            onClick={retry}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            重试
          </button>
        </div>
      </body>
    </html>
  );
}
