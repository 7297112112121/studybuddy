/**
 * 服务端结构化日志单例:JSON 行写 stdout,级别经 LOG_LEVEL 环境变量调节;
 * 留痕点只限异常归一点与适配点。浏览器代码不引入本文件。
 */
import pino from "pino";

export const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
