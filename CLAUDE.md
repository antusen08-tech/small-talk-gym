# Small Talk Gym

低压力社交练习场，帮内向者先看懂场合、再开口。不是"变外向"训练，是"先看讯号再决定说不说"。

## 文档索引

- `产品策划与内容交接稿.md` —— 产品方向、原则、四个一级菜单、内容结构、MVP 范围。**产品决策的唯一权威来源**，改动前先看这份。
- `初阶Coach内容库.md` —— Coach 初阶 5 技能、20 张卡的具体内容。
- `docs/superpowers/specs/2026-09-18-small-talk-gym-redesign-design.md` —— 重新规划的架构与 UI 视觉方向设计稿（技术栈、数据模型、Simulator 边界机制、UI 组件系统）。

## 技术方向（已定稿，见 design.md 第 3 节）

- 前端：React/Vite 单页 Web app，部署到 Vercel。
- 后端：Supabase（Postgres + Auth + Edge Function）。不自建服务器。
- AI：仅 Simulator 对话轮调用 Claude API，通过 Edge Function 转发，prompt 由场景卡字段组装。Coach 不调 AI，纯数据驱动 + 前端本地判分。
- 认证：Supabase 邮箱魔法链接（无密码）。

## 内容必须数据化，不要写死

Coach 卡片、Simulator 场景卡一律存进 Supabase 表（`skill_cards`／`scenario_themes`／`scene_cards`／`practice_records`，字段见 design.md 第 4 节），前端只做两个通用渲染组件。**不要**像现在的 `index.html` 原型那样为每张卡写一段独立 HTML + 专用 JS 函数——那是演示原型的写法，正式实现禁止沿用。

## 不可违反的产品原则（详见交接稿第 3 节）

- 先看讯号，再开口——这是训练目标本身，不是背台词。
- 不做现场 Emergency Spotter：Simulator 是模拟练习，不是让用户在真实互动中掏手机问 AI。
- Coach 教原则、Simulator 练应用，两者不自动硬接。
- 不给"对/错"判分式反馈，要给场景化解释。
- Simulator 每轮 AI 回复必须由场景卡（地点/关系/当前话题线/绿黄红灯）约束——这是产品差异化的核心，不能退化成自由聊天。
- 插图不要默认画男女配对，需穿插不同性别组合与不同人生阶段（见交接稿 11.1）。

## UI 视觉方向（见 design.md 第 9 节）

蓝紫色渐变背景 + 悬浮白色卡片的克制版软阴影风格（claymorphism 的简化实现）。**插画/角色素材和可交互 UI 组件是两条独立产线**：插画走 AI 图像生成或插画师产出静态素材；按钮/卡片/列表这些可交互元素用 CSS 软阴影组件系统实现，不要试图用 CSS 复刻照片级 3D 渲染效果——做不到，也不必要。

## 尚未决定，不要自行假设

品牌名称、精确配色数值与字体、插画产出方式与预算、付费结构、每日推荐机制是否保留、是否做推送通知。这些交给用户决定，不要在实现时替他做主。
