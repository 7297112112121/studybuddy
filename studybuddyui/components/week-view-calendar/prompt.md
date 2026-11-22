【角色】你是资深前端工程师，技术栈固定为 Next.js (App Router) + Tailwind CSS + shadcn/ui + TypeScript。

【任务】复现附件截图中红色框选区域——一个「周视图日程日历」组件（Week View Calendar）。
严格 1:1 还原视觉规格。只生成这一个组件，不要生成右侧迷你月历、用户信息卡、分类侧栏，
也不要生成绿色框内的"新建活动"弹窗（Create Activity Modal）。

【设计规格】
1. 容器：白色圆角卡片（rounded-2xl，p-6），背景色 #E9E7F6，卡片阴影 0 4px 16px rgba(91,91,214,0.08)。
2. 顶部工具栏三栏布局：
   - 左：粗体标题 "September, 2020"（text-[22px] font-bold text-[#1A1A2E]）
   - 中：分段控制器 Week / Month / Year，选中态 Week 为 primary 文字 #5B5BD6 + 白底胶囊，未选中为灰字
   - 右：< 按钮、Today 按钮（白底圆角 border）、> 按钮，三者等宽圆角 8px
3. 表头行：左侧一个小日历图标占位，右侧 7 列等宽（Monday…Sunday），
   每列上方星期名（text-[13px] font-semibold），下方日期 21.09–27.09（text-[11px] text-muted）；
   今天 Tuesday 22.09 的星期名用 primary #5B5BD6 高亮。
4. 主体网格：左侧 64px 时间轴标注 07:00、08:00…12:00（text-[11px] text-muted，右对齐），
   每行高 64px，浅灰横线 #EEF0F5 贯穿 7 列。
5. 当前时间线：一条 1px 红线 #F5484B 水平贯穿所有列，左端贴红色圆角胶囊标签 "09:30"（白字）。
6. 4 个事件卡片（absolute 定位，rounded-xl，shadow-card，p-2.5）：
   - 周一 07:00–09:00：event_clients 配色，标题 "Show project to Jes Parker"，底部蓝色小方块+标签 "Clients"
   - 周二 10:00–12:00：event_lavender 配色，标题 "Meet Jason at the International Airport"，
     左上角红色火焰图标 + 粉色胶囊标签 "30 min to go"，底部标签 "Clients"
   - 周五 07:00–09:00：event_work 配色，标题 "Meeting with a team"，底部橙色圆点+标签 "Work"
   - 周日 10:00–12:00：event_personal 配色，标题 "Call with Clark Kent"，底部标签 "Personal"

【约束】
- 所有颜色必须从上附 JSON 色板中选取，禁止自创色值；primary 只允许 #5B5BD6，不要用 blue-600。
- 事件卡片按分类使用对应 event_* 配色，禁止全部用同一种颜色。
- 字体统一 Inter；禁止加任何截图中不存在的元素（不含侧栏、不含弹窗、不含底部导航）。
- 只输出组件 TSX 代码 + 必要 Tailwind class，不写解释文字。

