/**
 * 集成测试共享 helper（Task 5）。
 */

let uniquePhoneSeq = 0;

/**
 * 每次调用返回不重复的合法手机号（^1[3-9]\d{9}$）。
 *
 * Better Auth phoneNumber 插件默认限流 10 次/60 秒（以手机号为维度计数），
 * 且 user_phone_number 唯一索引跨测试运行持久化（compose 卷）——时间戳主干
 * 保证跨运行不重复，末位计数器保证同毫秒内并发/连续调用不重复，
 * 从源头防限流 429 与唯一冲突串扰。
 */
export function uniquePhone(): string {
  uniquePhoneSeq = (uniquePhoneSeq + 1) % 10;
  const stem = String(Date.now()).slice(-8).padStart(8, "0");
  const head = 3 + (uniquePhoneSeq % 7); // 3..9，落在 PHONE_RE 合法域
  return `1${head}${stem}${uniquePhoneSeq}`;
}
