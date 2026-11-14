import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  account,
  registerInputSchema,
  session,
  user,
  verification,
} from "../../src/modules/auth/schema";

/** 将列清单转成 name -> column 的映射，便于按列断言。 */
function columnMap(table: Parameters<typeof getTableConfig>[0]) {
  const { columns } = getTableConfig(table);
  return Object.fromEntries(columns.map((c) => [c.name, c]));
}

describe("registerInputSchema", () => {
  const validInput = {
    phone: "13800138000",
    password: "abcd1234",
    confirmPassword: "abcd1234",
    agreementAccepted: true,
  };

  it("合法入参通过", () => {
    expect(registerInputSchema.safeParse(validInput).success).toBe(true);
  });

  it("phone '1380013800'（10 位）拒绝", () => {
    expect(
      registerInputSchema.safeParse({ ...validInput, phone: "1380013800" })
        .success,
    ).toBe(false);
  });

  it("password '12345678'（无字母）拒绝", () => {
    expect(
      registerInputSchema.safeParse({
        ...validInput,
        password: "12345678",
        confirmPassword: "12345678",
      }).success,
    ).toBe(false);
  });

  it("confirmPassword 与 password 不一致拒绝", () => {
    expect(
      registerInputSchema.safeParse({
        ...validInput,
        confirmPassword: "abcd1235",
      }).success,
    ).toBe(false);
  });

  it("agreementAccepted: false 拒绝（z.literal(true)）", () => {
    expect(
      registerInputSchema.safeParse({
        ...validInput,
        agreementAccepted: false,
      }).success,
    ).toBe(false);
  });
});

describe("user 表", () => {
  const config = getTableConfig(user);
  const cols = columnMap(user);

  it("id 为主键", () => {
    expect(cols["id"]?.primary).toBe(true);
  });

  it("name 列 notNull", () => {
    expect(cols["name"]?.notNull).toBe(true);
  });

  it("email 列 notNull 且唯一", () => {
    expect(cols["email"]?.notNull).toBe(true);
    expect(cols["email"]?.isUnique).toBe(true);
  });

  it("phoneNumber 列 notNull", () => {
    expect(cols["phone_number"]?.notNull).toBe(true);
  });

  it("唯一索引显式命名 user_phone_number 且落在 phoneNumber 列", () => {
    const idx = config.indexes.find(
      (i) => i.config.name === "user_phone_number",
    );
    expect(idx).toBeDefined();
    expect(idx?.config.unique).toBe(true);
    expect(
      (idx?.config.columns[0] as { name?: string } | undefined)?.name,
    ).toBe("phone_number");
  });

  it("agreementVersion 列 notNull（R15）", () => {
    expect(cols["agreement_version"]?.notNull).toBe(true);
  });

  it("agreedAt 列 notNull（R15）", () => {
    expect(cols["agreed_at"]?.notNull).toBe(true);
  });

  it("emailVerified / phoneNumberVerified 为 notNull 默认 false 的 boolean", () => {
    expect(cols["email_verified"]?.notNull).toBe(true);
    expect(cols["phone_number_verified"]?.notNull).toBe(true);
    expect(cols["email_verified"]?.columnType).toBe("PgBoolean");
    expect(cols["phone_number_verified"]?.columnType).toBe("PgBoolean");
  });

  it("image 列 nullable", () => {
    expect(cols["image"]?.notNull).toBe(false);
  });

  it("createdAt / updatedAt 列 notNull", () => {
    expect(cols["created_at"]?.notNull).toBe(true);
    expect(cols["updated_at"]?.notNull).toBe(true);
  });
});

describe("account 表", () => {
  const config = getTableConfig(account);
  const cols = columnMap(account);

  it("id 为主键", () => {
    expect(cols["id"]?.primary).toBe(true);
  });

  it("providerId 列存在且 notNull", () => {
    expect(cols["provider_id"]).toBeDefined();
    expect(cols["provider_id"]?.notNull).toBe(true);
  });

  it("accountId 列 notNull", () => {
    expect(cols["account_id"]?.notNull).toBe(true);
  });

  it("userId 外键指向 user.id 且 onDelete cascade", () => {
    expect(cols["user_id"]?.notNull).toBe(true);
    const fk = config.foreignKeys.find(
      (k) =>
        k.reference().columns[0]?.name === "user_id" &&
        k.reference().foreignColumns[0]?.name === "id",
    );
    expect(fk).toBeDefined();
    expect(fk?.onDelete).toBe("cascade");
    expect(fk?.reference().foreignColumns[0]?.name).toBe("id");
  });

  it("password 列 nullable（R13 摘要列，OAuth 场景恒空）", () => {
    expect(cols["password"]).toBeDefined();
    expect(cols["password"]?.notNull).toBe(false);
  });

  it("OAuth 场景列均 nullable", () => {
    for (const name of [
      "access_token",
      "refresh_token",
      "id_token",
      "token_type",
      "scope",
      "access_token_expires_at",
      "refresh_token_expires_at",
    ]) {
      expect(cols[name]?.notNull).toBe(false);
    }
  });

  it("createdAt / updatedAt 列 notNull", () => {
    expect(cols["created_at"]?.notNull).toBe(true);
    expect(cols["updated_at"]?.notNull).toBe(true);
  });
});

describe("session 表", () => {
  const config = getTableConfig(session);
  const cols = columnMap(session);

  it("id 为主键", () => {
    expect(cols["id"]?.primary).toBe(true);
  });

  it("token 列 notNull 且唯一", () => {
    expect(cols["token"]?.notNull).toBe(true);
    expect(cols["token"]?.isUnique).toBe(true);
  });

  it("userId 外键 cascade", () => {
    const fk = config.foreignKeys.find(
      (k) => k.reference().foreignColumns[0]?.name === "id",
    );
    expect(fk).toBeDefined();
    expect(fk?.reference().columns[0]?.name).toBe("user_id");
    expect(fk?.onDelete).toBe("cascade");
  });

  it("expiresAt 列 notNull", () => {
    expect(cols["expires_at"]?.notNull).toBe(true);
  });

  it("ipAddress / userAgent 列 nullable", () => {
    expect(cols["ip_address"]?.notNull).toBe(false);
    expect(cols["user_agent"]?.notNull).toBe(false);
  });
});

describe("verification 表", () => {
  const cols = columnMap(verification);

  it("id 为主键，identifier / value / expiresAt 均 notNull", () => {
    expect(cols["id"]?.primary).toBe(true);
    expect(cols["identifier"]?.notNull).toBe(true);
    expect(cols["value"]?.notNull).toBe(true);
    expect(cols["expires_at"]?.notNull).toBe(true);
  });
});
