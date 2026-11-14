/**
 * 公共契约 barrel（design「数据模型」节放置约定）：依赖规则 5
 * 「人人可读、写入仅属主」——外部只从这里引用 auth 表契约，不得直连模块文件。
 */
export * from "../modules/auth/schema";
