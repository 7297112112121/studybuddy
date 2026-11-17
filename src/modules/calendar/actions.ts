"use server";

/**
 * calendar Server Actions（AXY-22 design「契约」节，ADR-0025 基线流）。
 *
 * 统一归一流：getCurrentSession → 无会话 UNAUTHORIZED；zod safeParse 复验
 * → INVALID_INPUT（fieldErrors 只装错误 key，不返回文案原文，ADR-0010）；
 * service 调用成功 → revalidatePath(ROUTES.calendar) → { ok: true }；
 * service false（未命中或不属该用户）→ NOT_FOUND；DB 异常 → SAVE_FAILED。
 * userId 一律取自会话，不收客户端传入（R7 接口半边）。
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ROUTES } from "@/lib/routes";
import { getCurrentSession } from "@/modules/auth";

import {
  calendarEntryInputSchema,
  type CalendarEntryInput,
  type CalendarFieldErrors,
} from "./schema";
import { createEntry, deleteEntry, updateEntry } from "./service";

export type CalendarEntryActionResult =
  | { ok: true }
  | { ok: false; error: "INVALID_INPUT"; fieldErrors: CalendarFieldErrors } // E-01 / E-03 由 fieldErrors 承载
  | { ok: false; error: "UNAUTHORIZED" } // 无有效会话，客户端跳 /login
  | { ok: false; error: "NOT_FOUND" } // 条目不存在或不属该用户，客户端静默刷新
  | { ok: false; error: "SAVE_FAILED" }; // E-02

/** zod issues → 字段级错误（同字段取首个 issue，值为 i18n key）。 */
function toFieldErrors(error: z.ZodError): CalendarFieldErrors {
  const fieldErrors: CalendarFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (
      typeof field === "string" &&
      field in fieldErrors === false &&
      (field === "date" ||
        field === "title" ||
        field === "startTime" ||
        field === "endTime")
    ) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

type WriteResult = boolean | void;

/** 三 action 共用的归一流（会话 → 复验 → service → revalidate）。 */
async function runAction(
  input: CalendarEntryInput,
  entryId: string | null,
  write: (userId: string, input: CalendarEntryInput, entryId: string | null) => Promise<WriteResult>,
): Promise<CalendarEntryActionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { ok: false, error: "UNAUTHORIZED" };
  }

  const parsed = calendarEntryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "INVALID_INPUT", fieldErrors: toFieldErrors(parsed.error) };
  }

  let result: WriteResult;
  try {
    result = await write(session.user.id, parsed.data, entryId);
  } catch {
    return { ok: false, error: "SAVE_FAILED" };
  }
  if (result === false) {
    return { ok: false, error: "NOT_FOUND" };
  }

  revalidatePath(ROUTES.calendar);
  return { ok: true };
}

export async function createEntryAction(
  input: CalendarEntryInput,
): Promise<CalendarEntryActionResult> {
  return runAction(input, null, (userId, data) => createEntry(userId, data));
}

export async function updateEntryAction(
  entryId: string,
  input: CalendarEntryInput,
): Promise<CalendarEntryActionResult> {
  return runAction(input, entryId, (userId, data, id) =>
    id === null ? Promise.resolve(false) : updateEntry(userId, id, data),
  );
}

export async function deleteEntryAction(
  entryId: string,
): Promise<CalendarEntryActionResult> {
  const session = await getCurrentSession();
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
