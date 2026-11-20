"use server";

/**
 * 文件作用:calendar 模块的 Server Actions 入口,衔接前端调用与读写 service。
 *
 * 成员:
 * 1. 条目操作结果(CalendarEntryActionResult):条目增改删的统一结果类型;
 * 2. 创建条目动作(createEntryAction):创建一条日历条目;
 * 3. 更新条目动作(updateEntryAction):更新指定条目;
 * 4. 删除条目动作(deleteEntryAction):删除指定条目;
 * 5. 提案结果(ProposalActionResult):请求 AI 资料提案的结果类型;
 * 6. 请求提案动作(requestProposalAction):请求条目的 AI 资料提案;
 * 7. 提案写入结果(ProposalWriteResult):确认写入提案的结果类型;
 * 8. 确认提案动作(confirmProposalAction):把确认的提案写入数据库。
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
} from "./schema";
import { createEntry, deleteEntry, updateEntry } from "./service";
import {
  EntryNotFoundError,
  confirmedProposalSchema,
  requestEntryProposal,
  confirmEntryProposal,
  type EntryProposal,
} from "./proposal";

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

export type ProposalActionResult =
  | { ok: true; proposal: EntryProposal }
  | { ok: false; error: "UNAUTHORIZED" } // 无有效会话,客户端跳登录页
  | { ok: false; error: "NOT_FOUND" } // 条目不存在或不属于该用户
  | {
      ok: false;
      error: "INVALID_INPUT";
      fieldErrors: { answer?: string }; // 答复字段校验失败,值为文案 key
    }
  | { ok: false; error: "AI_UNAVAILABLE" }; // AI 服务不可用,提示可重试

const ANSWER_MAX = 200; // 追问答复 1~200 字

/**
 * 作用:请求条目的 AI 资料提案。
 *
 * 流程:
 * 1. 校验会话;无有效会话返回未授权(UNAUTHORIZED)。
 * 2. 校验追问答复;非空答复长度不在 1~200 字时,返回输入无效(INVALID_INPUT)
 *    并携带答复字段错误。
 * 3. 编排提案;条目不存在或不属于该用户返回未找到(NOT_FOUND)。
 * 4. 成功返回提案。
 *
 * 其他:AI 层失败与其余基础设施异常统一返回 AI 不可用(AI_UNAVAILABLE)。
 */
export async function requestProposalAction(
  entryId: string,
  userRangeAnswer: string | null,
): Promise<ProposalActionResult> {
  const session = await requireSession();
  if (!session) {
    return { ok: false, error: "UNAUTHORIZED" };
  }

  if (userRangeAnswer !== null) {
    const trimmed = userRangeAnswer.trim();
    if (trimmed.length < 1 || trimmed.length > ANSWER_MAX) {
      return {
        ok: false,
        error: "INVALID_INPUT",
        fieldErrors: { answer: "calendar.proposal.answerRequired" },
      };
    }
  }

  try {
    const proposal = await requestEntryProposal(
      session.user.id,
      entryId,
      userRangeAnswer === null ? null : userRangeAnswer.trim(),
    );
    return { ok: true, proposal };
  } catch (error) {
    if (error instanceof EntryNotFoundError) {
      return { ok: false, error: "NOT_FOUND" };
    }
    // AI 层失败与其余基础设施异常统一按 AI 不可用处理,提示可重试
    return { ok: false, error: "AI_UNAVAILABLE" };
  }
}

export type ProposalWriteResult =
  | { ok: true }
  | { ok: false; error: "UNAUTHORIZED" }
  | { ok: false; error: "NOT_FOUND" } // 来源条目不存在或不属于该用户
  | { ok: false; error: "INVALID_INPUT" } // 确认载荷结构违反
  | { ok: false; error: "WRITE_FAILED" }; // 数据库写入失败(含事务回滚)

/**
 * 作用:把确认的提案写入数据库。
 *
 * 流程:
 * 1. 校验会话;无有效会话返回未授权(UNAUTHORIZED)。
 * 2. 复验确认载荷结构;结构违反返回输入无效(INVALID_INPUT)。
 * 3. 事务写入;写入失败(含事务回滚)返回写入失败(WRITE_FAILED),
 *    来源条目不存在或不属于该用户返回未找到(NOT_FOUND)。
 * 4. 成功刷新日历路径缓存并返回成功。
 */
export async function confirmProposalAction(
  proposal: unknown,
): Promise<ProposalWriteResult> {
  const session = await requireSession();
  if (!session) {
    return { ok: false, error: "UNAUTHORIZED" };
  }

  const parsed = confirmedProposalSchema.safeParse(proposal);
  if (!parsed.success) {
    return { ok: false, error: "INVALID_INPUT" };
  }

  try {
    const written = await confirmEntryProposal(session.user.id, parsed.data);
    if (!written) {
      return { ok: false, error: "NOT_FOUND" };
    }
  } catch {
    return { ok: false, error: "WRITE_FAILED" };
  }
  revalidatePath(ROUTES.calendar);
  return { ok: true };
}

/** 作用:会话守卫的单一收拢点;null 表示无有效会话,由调用点归一为未授权(UNAUTHORIZED)。 */
async function requireSession() {
  return getCurrentSession();
}
