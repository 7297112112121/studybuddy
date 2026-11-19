# 编码排版纪律（implementation 技能引用）

执行期每任务提交前逐条自查；本文件是编码排版规则的真源，规则**包括但不局限于**以下条目，新增排版规则登记于此。

## import 排版

- 具名 import 一律多行花括号（单个导入也多行），禁止单行 `import { x } from "…";`；
- 分组与空行：外部依赖（包名）之间隔一行，同包多条 import 不隔行；内部依赖（`@/`、相对路径）之间不隔行；外部与内部依赖之间隔一行；
- 排序：从上到下先外部依赖，后内部依赖。

```ts
// 合规格式示例
import {
  useState,
} from "react";

import {
  z,
} from "zod";

import {
  LoginForm,
} from "@/modules/auth/components/LoginForm";
```
