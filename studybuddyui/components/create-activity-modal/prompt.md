【角色】你是一名资深前端工程师，精通 Tailwind CSS + React shadcn/ui

【任务】复现设计稿中红框内的「创建日程活动」弹窗（Modal Dialog），严格 1:1 还原视觉规格。弹窗浮在日历视图之上，背后可带半透明遮罩。

【设计规格】

▍布局层
- 弹窗容器：宽度 w-72（288px），白色背景 #FFFFFF，圆角 rounded-2xl（16px），阴影 shadow-[0_20px_50px_-12px_rgba(31,32,51,0.25)]，内边距 p-6（24px）
- 内部纵向流式排列，各区块垂直间距：标题 → 表单项 mb-5；表单项之间用 1px 分隔线；chips 区 mt-4；头像区 mt-5；主按钮 mt-6
- 表单项为左右结构：左侧文字 flex-1，右侧 w-4 h-4 图标右对齐，垂直居中，行高 py-3.5（14px 上下）

▍色板（锁定，禁止自创色值）
- 主色（按钮/强调）：#593BFF
- 文字主色：#23243A
- 文字辅助色：#8B8DA6
- 分隔线/边框：#ECECF1
- 弹窗背景：#FFFFFF
- 遮罩背景：rgba(31,32,51,0.35)
- 分类 Work（橙）：底色 #FFF1E6，文字 #F2994A
- 分类 Clients（紫）：底色 #F0EDFC，文字 #6C5CE7
- 分类 Personal（蓝）：底色 #EAF3FD，文字 #3B82F6

▍字号与字重阶梯
- 弹窗标题：text-lg（18px）font-semibold，颜色 #23243A
- 表单行文字（日期/时间/地点）：text-sm（14px）font-normal，颜色 #23243A
- 分类 chip 文字：text-xs（12px）font-medium
- 按钮文字：text-sm（14px）font-medium，白色 #FFFFFF
- 图标：w-4 h-4，线性 outline，颜色 #8B8DA6

▍组件清单（从上到下）
1. 标题：「Meet with Tom Comp」，左对齐，无关闭按钮在本视图中呈现
2. 日期行：底部 border-b border-#ECECF1；左侧文字「Thursday, 23 September」；右侧日历图标（outline calendar）
3. 时间行：底部 border-b border-#ECECF1；左右两栏并排，各为下拉选择器：
   - 左：「07:00」+ 右侧 chevron-down
   - 右：「08:00」+ 右侧 chevron-down
   - 两栏 gap-4
4. 地点行：底部 border-b border-#ECECF1；左侧文字「St Patrick Street, 18」；右侧定位图标（outline map-pin）
5. 分类标签区：flex flex-wrap gap-2，三个 chip：
   - chip 通用规格：h-7 px-3 rounded-lg，文字 text-xs font-medium，无边框
   - 「Work」：bg-#FFF1E6 text-#F2994A
   - 「Clients projects」：bg-#F0EDFC text-#6C5CE7
   - 「Personal projects」：bg-#EAF3FD text-#3B82F6
6. 成员头像区：flex items-center gap-2，4 个真实圆形头像（w-8 h-8 rounded-full，object-cover，轻微 ring-2 ring-white），末尾 1 个「添加成员」占位圆：
   - w-8 h-8 rounded-full，border-2 border-dashed border-#593BFF/40，内部居中一个 #593BFF 加号图标 w-3.5 h-3.5
7. 主按钮：w-full h-11 rounded-xl bg-#593BFF，flex items-center justify-center gap-2；白色加号图标（filled plus）w-4 h-4；文字「Create Activity」text-white；hover:bg-#4A2FE0；active:scale-[0.98]

▍交互层
- 弹窗出现：fade-in + 轻微上移（translate-y-2 → 0），duration-200 ease-out
- 下拉选择器点击后展开时间/日期浮层（本组件只渲染触发态）
- chip 为可切换选中态：当前稿均为已选中（彩色浅底）；未选中态改为 bg-#F4F4F8 text-#8B8DA6
- 头像占位圆点击触发选人面板

【约束】
- 仅输出 JSX + Tailwind className（可用 shadcn/ui Dialog / Select / Avatar / Button 语义命名），不要解释
- 所有色值必须从上方色板选取，禁止自创色值
- 圆角层级：卡片 16px、chip 8px、按钮 12px，不要混用
- 头像使用纯色/渐变占位图，不要引入真实图片链接
- 严格按上述间距与字号，不要自行增减

