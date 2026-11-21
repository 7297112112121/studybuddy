"use server";

/**
 * 文件作用:calendar 模块的 Server Actions 入口,衔接前端调用与读写 service。
 *
 * 成员:
 * 1. 条目操作结果(CalendarEntryActionResult):条目增改删的统一结果类型;
 * 2. 创建条目动作(createEntryAction):创建一条日历条目;
 * 3. 更新条目动作(updateEntryAction):更新指定条目;
 * 4. 删除条目动作(deleteEntryAction):删除指定条目。
 *
 * 其他:
 * 1. userId 一律取自会话,不收客户端传入;
 * 2. 入参先经 zod 复验,fieldErrors 只装错误 key,不返回文案原文;
 * 3. 增改删走统一归一流(胶水单一来源 @/lib/action):会话校验、入参复验、service 调用、刷新日历缓存。
 */
import { revalidatePath } from "next/cache";

import { ActionResult, runAction } from "@/lib/action";
import { ROUTES } from "@/lib/routes";
import { getCurrentSession } from "@/modules/auth";
import {
  calendarEntryInputSchema,
  type CalendarEntryInput,
  type CalendarFieldErrors,
} from "./validators";
import { createEntry, deleteEntry, updateEntry } from "./service";

export type CalendarEntryActionResult = ActionResult<CalendarFieldErrors>;

/** 作用:创建一条日历条目,走统一归一流。 */
export async function createEntryAction(
  input: CalendarEntryInput,
): Promise<CalendarEntryActionResult> {
  return runAction(
    await getCurrentSession(),
    input,
    calendarEntryInputSchema,
    (userId, data) => createEntry(userId, data),
    ROUTES.calendar,
  );
}

/** 作用:更新指定条目,走统一归一流;条目不存在或不属于该用户按未找到处理。 */
export async function updateEntryAction(
  entryId: string,
  input: CalendarEntryInput,
): Promise<CalendarEntryActionResult> {
  return runAction(
    await getCurrentSession(),
    input,
    calendarEntryInputSchema,
    (userId, data) => updateEntry(userId, entryId, data),
    ROUTES.calendar,
  );
}

/**
 * 作用:删除指定条目。
 *
 * 流程:
 * 1. 校验会话;无有效会话返回未授权(UNAUTHORIZED)。
 * 2. 删除条目;数据库异常返回保存失败(SAVE_FAILED),条目不存在或不属于
 *    该用户返回未找到(NOT_FOUND)。
 * 3. 成功刷新日历路径缓存并返回成功。
 */
export async function deleteEntryAction(
  entryId: string,
): Promise<CalendarEntryActionResult> {
  const session = await requireSession();
  if (!session) {
    return { ok: false, error: "UNAUTHORIZED" };
  }
  let deleted: boolean;
  try {
    deleted = await deleteEntry(session.user.id, entryId);
  } catch {
    return { ok: false, error: "SAVE_FAILED" };
  }
  if (!deleted) {
    return { ok: false, error: "NOT_FOUND" };
  }
  revalidatePath(ROUTES.calendar);
  return { ok: true };
}

/** 作用:会话守卫的单一收拢点;null 表示无有效会话,由调用点归一为未授权(UNAUTHORIZED)。 */
async function requireSession() {
  return getCurrentSession();
}
