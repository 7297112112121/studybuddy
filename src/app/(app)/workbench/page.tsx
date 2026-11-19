/**
 * /workbench 承接页（design 边界 B10：工作台未实现，AXY-12 正式设计替换）。
 *
 * 承接形态（proposal 边界 #10，E2E 验收锚点 R6/R9/R12：到达 /workbench 且
 * 渲染承接标识）：标题「工作台」+ 当前登录账户名 + 退出登录按钮。
 * (app) 布局已做服务端守卫（B6）；此处再次读取会话取展示数据，类型收窄
 * 前提下保留同一守卫动作（纵深防御，未登录不可渲染任何承接内容）。
 *
 * Next 16 cacheComponents 预渲染校验豁免（与根布局同一豁免，instant =
 * false）：会话读取无法纳入静态预渲染，允许阻塞在请求期渲染。
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentSession, SignOutButton } from "@/modules/auth";
import { ROUTES } from "@/lib/routes";

export const instant = false;

export default async function WorkbenchPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect(ROUTES.login);
  }
  const t = await getTranslations("calendar");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted p-4">
      <h1 className="text-2xl font-bold text-foreground">工作台</h1>
      <p className="text-sm text-muted-foreground">
        当前登录：
        <span data-testid="session-account">{session.user.username}</span>
      </p>
      <SignOutButton />
      {/* AXY-22 D-06：仅新增「日程日历」入口链接，不改既有承接行为 */}
      <Link
        href={ROUTES.calendar}
        data-testid="calendar-entry"
        className="text-sm font-medium underline-offset-4 hover:underline"
      >
        {t("entryPoint")}
      </Link>
    </main>
  );
}
