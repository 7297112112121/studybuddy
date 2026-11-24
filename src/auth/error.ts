/**
 * 文件作用：认证技术报错
 */

/** 注册唯一冲突：账户名/占位邮箱 unique 约束（23505）触发——service 判定、注册端点透传（HTTP 409）、客户端映射为账户名已存在文案。 */
export const USERNAME_ALREADY_REGISTERED = "USERNAME_ALREADY_REGISTERED";
