/**
 * 跨轨测试造号共享件(测试纪律:测试共享件唯一实现):单元轨与 E2E 轨
 * 同源导入,禁止两轨各自实现。本文件不 import 产品代码,规则锚定由
 * 符合性测试(username.test.ts 断言产出过 USERNAME_RE)承担。
 */

let seq = 0;

/**
 * 每次调用返回不重复且 F-01 合法(USERNAME_RE:[一-龥A-Za-z0-9_]{1,16})的
 * 账户名(14 位 ≤ 16)。
 *
 * user_username 唯一索引跨测试运行持久化(compose 卷)——时间戳主干(36
 * 进制,约 89 年跨度)保证跨运行不重复,模内计数器保证同毫秒内连续调用
 * 不重复,随机尾进一步防并行 worker 同毫秒同计数器碰撞,从源头防唯一
 * 冲突串扰。全字符落在 [0-9a-z],uppercase() 后仍是 F-01 合法变体。
 */
export function uniqueUsername(): string {
  seq = (seq + 1) % 10;
  const stem = Date.now().toString(36).slice(-8).padStart(8, "0");
  const tail = crypto.randomUUID().replace(/-/g, "").slice(0, 4);
  return `u${stem}${tail}${seq}`;
}
