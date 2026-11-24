/**
 * 公共契约 barrel（design「数据模型」节放置约定）：依赖规则 5
 * 「人人可读、写入仅属主」——外部只从这里引用各业务域表契约，不得直连域文件。
 * 各域表定义在 src/db/<域>-schema.ts。
 */
export * from "./auth-schema";
export * from "./calendar-schema";
