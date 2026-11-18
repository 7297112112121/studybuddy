"use client";

/**
 * 深空星点背景(calendar 页品牌视觉,视差参考实现的本仓库化)。
 *
 * 与参考实现的差异(有意为之):
 * - 种子随机(mulberry32)替代 Math.random——SSR 与客户端水合必须产出
 *   逐字节一致的 box-shadow,否则 hydration mismatch;
 * - 内联 <style> 上收 globals.css(.stars-sky / .stars-layer / 星漂移
 *   keyframes),随 Tailwind 单源管理;
 * - 不带标题/children——本组件是页面背景层(fixed inset-0 +
 *   pointer-events-none + aria-hidden),内容始终是日历本身;
 * - 配色走 aurora 体系:星点白,氛围渐变在 .stars-sky(ink 深空底)。
 *
 * 无限循环原理:每层渲染两份相同 shadow 的星点(本体 top-0、副本
 * top-2000px),容器动画 translateY(-2000px) 后副本恰接替本体,重置无缝。
 * prefers-reduced-motion 下停止漂移,保留静态星点(globals.css)。
 */
import { useMemo } from "react";

import { cn } from "cn";

/** mulberry32 种子随机:确定性输出,水合安全。 */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 横向铺星的最大 x(px);纵向跨度固定 2000(与循环位移一致)。 */
const SKY_WIDTH = 2560;
const LOOP_HEIGHT = 2000;

/** 生成 n 个 "x y #FFF" box-shadow 串(白星点)。 */
function generateShadows(count: number, seed: number): string {
  const rand = mulberry32(seed);
  const shadows: string[] = [];
  for (let i = 0; i < count; i++) {
    shadows.push(
      `${Math.floor(rand() * SKY_WIDTH)}px ${Math.floor(rand() * LOOP_HEIGHT)}px #FFF`,
    );
  }
  return shadows.join(", ");
}

/** 三层视差:星点尺寸、数量与基础漂移时长(秒)逐层递增制造纵深。 */
const LAYERS = [
  { count: 700, size: 1, duration: 50 },
  { count: 200, size: 2, duration: 100 },
  { count: 100, size: 3, duration: 150 },
] as const;

type StarsBackgroundProps = {
  /** 漂移速度倍率,越高越快(时长反比缩放)。 */
  speed?: number;
  className?: string;
};

export default function StarsBackground({
  speed = 1,
  className,
}: StarsBackgroundProps) {
  // 每层独立种子,shadow 仅在挂载期生成一次(memo 化避免重渲染抖动)
  const layers = useMemo(
    () =>
      LAYERS.map((layer, i) => ({
        ...layer,
        shadows: generateShadows(layer.count, 0x5f3759df + i),
      })),
    [],
  );

  return (
    <div
      aria-hidden="true"
      data-testid="stars-sky"
      className={cn(
        "stars-sky pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      {layers.map((layer) => (
        <div key={layer.size} className="absolute left-0 top-0">
          <div
            data-star-layer
            className="stars-layer"
            style={{
              width: layer.size,
              height: layer.size,
              boxShadow: layer.shadows,
              animationDuration: `${layer.duration / speed}s`,
            }}
          />
          <div
            className="stars-layer"
            style={{
              width: layer.size,
              height: layer.size,
              top: LOOP_HEIGHT,
              boxShadow: layer.shadows,
              animationDuration: `${layer.duration / speed}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
