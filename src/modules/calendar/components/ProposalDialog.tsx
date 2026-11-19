"use client";

/**
 * 提案浮层(AXY-24 design「UI 与组件」节,演示态 1–5 的浮层本体):
 * 提案是界面临时态,全部本地 state,不入 zustand、不落库(D-13)。
 * 状态机:idle(挂载即 loading)→ loading → needRange / plan /
 * notApplicable / notFound / unavailable →(plan 确认)writing → 成功 onClose。
 * 重新生成(R9)= 再次 requestProposalAction,新响应整体替换本地提案态;
 * 关闭浮层即丢弃本地态。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/lib/routes";
import {
  confirmProposalAction,
  requestProposalAction,
} from "../actions";
import type { ProposalDay } from "../proposal";

type ProposalDialogProps = {
  entryId: string;
  entryTitle: string;
  onClose: () => void;
};

type Phase =
  | "loading"
  | "needRange"
  | "plan"
  | "notApplicable"
  | "notFound"
  | "unavailable";

export default function ProposalDialog({
  entryId,
  entryTitle,
  onClose,
}: ProposalDialogProps) {
  const t = useTranslations("calendar");
  const tRoot = useTranslations();
  const router = useRouter();
  // onClose / router 经 ref 引用:挂载 effect 只跑一次(否则父级每轮渲染
  // 传新 onClose / useRouter 返回新对象都会重触发发起)
  const onCloseRef = useRef(onClose);
  const routerRef = useRef(router);
  useEffect(() => {
    onCloseRef.current = onClose;
    routerRef.current = router;
  });

  const [phase, setPhase] = useState<Phase>("loading");
  const [planDays, setPlanDays] = useState<ProposalDay[] | null>(null);
  const [notFoundReason, setNotFoundReason] = useState("");
  const [answer, setAnswer] = useState("");
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [writeFailed, setWriteFailed] = useState(false);
  const lastAnswerRef = useRef<string | null>(null);

  const handleRequest = useCallback(
    async (userRangeAnswer: string | null): Promise<void> => {
      lastAnswerRef.current = userRangeAnswer;
      setPhase("loading");
      setWriteFailed(false);
      const result = await requestProposalAction(entryId, userRangeAnswer);
      if (!result.ok) {
        switch (result.error) {
          case "UNAUTHORIZED":
            routerRef.current.replace(ROUTES.login);
            return;
          case "INVALID_INPUT":
            setAnswerError(result.fieldErrors.answer ?? null);
            setPhase("needRange");
            return;
          case "NOT_FOUND":
            // 来源条目已被并行删除:提示态无对应文案,静默关闭交给父级刷新
            onCloseRef.current();
            return;
          case "AI_UNAVAILABLE":
            setPhase("unavailable");
            return;
        }
      }
      const { proposal } = result;
      switch (proposal.kind) {
        case "PLAN":
          setPlanDays(proposal.days);
          setPhase("plan");
          return;
        case "NEEDS_RANGE":
          setAnswerError(null);
          setPhase("needRange");
          return;
        case "NEEDS_RANGE_INCOMPREHENSIBLE":
          setAnswerError("calendar.proposal.answerUnclear");
          setPhase("needRange");
          return;
        case "NOT_APPLICABLE":
          setPhase("notApplicable");
          return;
        case "NOT_FOUND":
          setNotFoundReason(proposal.reason);
          setPhase("notFound");
          return;
      }
    },
    [entryId],
  );

  // 挂载即发起(演示态 1 入口);微任务触发避免 effect 内同步 setState
  useEffect(() => {
    void Promise.resolve().then(() => handleRequest(null));
  }, [handleRequest]);

  function submitAnswer(): void {
    const trimmed = answer.trim();
    if (trimmed.length < 1) {
      setAnswerError("calendar.proposal.answerRequired");
      return;
    }
    void handleRequest(trimmed);
  }

  function regenerate(): void {
    void handleRequest(lastAnswerRef.current);
  }

  function updateDay(index: number, patch: Partial<ProposalDay>): void {
    setPlanDays((prev) => {
      if (prev === null) return prev;
      return prev.map((day, i) => (i === index ? { ...day, ...patch } : day));
    });
  }

  function removeDay(index: number): void {
    setPlanDays((prev) =>
      prev === null ? prev : prev.filter((_, i) => i !== index),
    );
  }

  async function handleConfirm(): Promise<void> {
    if (planDays === null || planDays.length === 0) {
      // 全部删光 = 放弃(不发确认请求)
      onClose();
      return;
    }
    setWriting(true);
    setWriteFailed(false);
    try {
      const result = await confirmProposalAction({ entryId, days: planDays });
      if (result.ok) {
        onClose();
        return;
      }
      setWriteFailed(true); // E-05:提案保留可重试
    } catch {
      setWriteFailed(true);
    } finally {
      setWriting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("proposal.title")}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          {t("proposal.sourceEntry")}:{entryTitle}
        </p>

        {phase === "loading" && (
          <p role="status" className="text-muted-foreground py-6 text-center text-sm">
            {t("proposal.generating")}
          </p>
        )}

        {phase === "needRange" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="proposal-answer">{t("proposal.followUpQuestion")}</Label>
            <Input
              id="proposal-answer"
              value={answer}
              maxLength={200}
              onChange={(e) => {
                setAnswer(e.target.value);
                setAnswerError(null);
              }}
            />
            {answerError !== null && (
              <p role="alert" className="text-destructive text-sm">
                {tRoot(answerError)}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>
                {t("proposal.closeButton")}
              </Button>
              <Button onClick={submitAnswer}>{t("proposal.continueButton")}</Button>
            </div>
          </div>
        )}

        {phase === "notApplicable" && (
          <div className="flex flex-col gap-3">
            <p role="alert" className="text-sm">{t("proposal.notApplicable")}</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>
                {t("proposal.closeButton")}
              </Button>
              <Button variant="ghost" onClick={regenerate}>
                {t("proposal.regenerateButton")}
              </Button>
            </div>
          </div>
        )}

        {phase === "notFound" && (
          <div className="flex flex-col gap-3">
            <p role="alert" className="text-sm">
              {t("proposal.notFound", { reason: notFoundReason })}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>
                {t("proposal.closeButton")}
              </Button>
              <Button variant="ghost" onClick={regenerate}>
                {t("proposal.regenerateButton")}
              </Button>
            </div>
          </div>
        )}

        {phase === "unavailable" && (
          <div className="flex flex-col gap-3">
            <p role="alert" className="text-sm">{t("proposal.unavailable")}</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>
                {t("proposal.closeButton")}
              </Button>
              <Button onClick={regenerate}>{t("proposal.retryButton")}</Button>
            </div>
          </div>
        )}

        {phase === "plan" && planDays !== null && (
          <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-3">
              {planDays.map((day, index) => (
                <li
                  key={`${day.date}-${index}`}
                  className="flex flex-col gap-1.5 rounded-lg border border-border p-3"
                >
                  <div className="grid grid-cols-[9rem_1fr_auto] items-end gap-2">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`proposal-day-date-${index}`}>
                        {t("proposal.dayDateLabel")}
                      </Label>
                      <Input
                        id={`proposal-day-date-${index}`}
                        aria-label={t("proposal.dayDateLabel")}
                        type="date"
                        value={day.date}
                        onChange={(e) => updateDay(index, { date: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`proposal-day-text-${index}`}>
                        {t("proposal.dayTextLabel")}
                      </Label>
                      <Input
                        id={`proposal-day-text-${index}`}
                        aria-label={t("proposal.dayTextLabel")}
                        maxLength={50}
                        value={day.text}
                        onChange={(e) => updateDay(index, { text: e.target.value })}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => removeDay(index)}
                    >
                      {t("entry.delete")}
                    </Button>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground text-xs">
                      {t("proposal.resourcesLabel")}
                    </span>
                    {day.resources.map((resource) => (
                      <a
                        key={resource.url}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary text-sm underline underline-offset-2"
                      >
                        {resource.title}
                      </a>
                    ))}
                  </div>
                </li>
              ))}
            </ul>

            {writeFailed && (
              <p role="alert" className="text-destructive text-sm">
                {t("proposal.writeFailed")}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>
                {t("proposal.closeButton")}
              </Button>
              <Button
                variant="ghost"
                onClick={regenerate}
                disabled={writing}
              >
                {t("proposal.regenerateButton")}
              </Button>
              <Button
                onClick={() => void handleConfirm()}
                disabled={writing}
              >
                {t("proposal.confirmButton")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
