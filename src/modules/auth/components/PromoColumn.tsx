/** 登录/注册屏的宣传列（PromoColumn），线框图静态文案示意、非真实数据。 */
import { CalendarCheck2Icon, CheckIcon } from "lucide-react";

export default function PromoColumn() {
  return (
    <aside className="order-2 flex flex-col justify-center lg:order-1">
      <div className="animate-in fade-in slide-in-from-bottom-4 [animation-duration:600ms] [animation-fill-mode:both] motion-reduce:animate-none">
        <p className="flex items-center gap-2 text-lg font-semibold">
          <CalendarCheck2Icon
            aria-hidden="true"
            className="size-5 text-aurora-aqua"
          />
          AI 学业陪伴
        </p>
        <p className="mt-6 max-w-lg text-4xl leading-snug font-semibold tracking-tight xl:text-5xl">
          你的规划、任务和情绪
          <br />
          都在
          <span className="bg-linear-[100deg] from-aurora-aqua-bright to-aurora-magenta bg-clip-text text-transparent">
            一个账号
          </span>
          里
        </p>
        <p className="mt-4 max-w-md text-sm text-muted-foreground">
          登录后接着上次的进度继续，换设备也一样。
        </p>
        <ul
          aria-hidden="true"
          className="mt-10 max-w-md space-y-1 border-l border-border pl-5"
        >
          <li className="flex items-center gap-3 py-1.5 text-sm">
            <span className="w-12 shrink-0 text-muted-foreground">08:00</span>
            <span className="flex-1 text-foreground/80">晨读 30 分钟</span>
            <CheckIcon aria-hidden="true" className="size-4 text-aurora-aqua" />
          </li>
          <li className="mx-[-1.25rem] flex items-center gap-3 rounded-lg bg-muted px-2.5 py-1.5 text-sm font-medium">
            <span className="w-12 shrink-0 text-muted-foreground">14:00</span>
            <span className="flex-1">微积分习题集</span>
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-aurora-aqua"
            />
          </li>
          <li className="flex items-center gap-3 py-1.5 text-sm">
            <span className="w-12 shrink-0 text-muted-foreground">21:30</span>
            <span className="flex-1 text-foreground/80">今日复盘</span>
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full border border-muted-foreground/50"
            />
          </li>
        </ul>
      </div>
    </aside>
  );
}
