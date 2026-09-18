# Small Talk Gym

低压力社交练习场，帮内向者先看懂场合、再开口。

**不是"变外向"训练，是"先看讯号再决定说不说"。**

## 项目状态

✅ React/Vite 应用已构建完成  
✅ Supabase 数据库架构已定义  
✅ UI 系统（蓝紫色渐变 + 软阴影）已实现  
✅ Coach 和 Simulator 组件已完成  
✅ 四个主屏幕已实现  

## 技术栈

- **前端**: React 19 + Vite 8
- **后端**: Supabase (Postgres + Auth + Edge Functions)
- **AI**: Claude API (仅用于 Simulator 对话)
- **部署**: Vercel (静态部署)

## 项目结构

```
small-talk-gym/
├── src/
│   ├── components/
│   │   ├── CoachCardPlayer.jsx       # 技能卡片播放器
│   │   ├── CoachCardPlayer.css
│   │   ├── SimulatorChatPlayer.jsx   # AI 对话模拟器
│   │   └── SimulatorChatPlayer.css
│   ├── screens/
│   │   ├── TodayScreen.jsx           # 今天页面
│   │   ├── LearningScreen.jsx        # 学习页面 (Coach)
│   │   ├── PracticeScreen.jsx        # 练习页面 (Simulator)
│   │   └── RecordsScreen.jsx         # 我的记录
│   ├── lib/
│   │   └── supabase.js               # Supabase 客户端
│   ├── App.jsx                        # 主应用
│   ├── main.jsx                       # 入口
│   └── index.css                      # 全局样式
├── supabase/
│   ├── schema.sql                     # 数据库架构
│   ├── README.md                      # Supabase 设置指南
│   └── functions/
│       └── simulator-chat/
│           └── index.ts               # Claude API Edge Function
├── docs/
│   └── superpowers/specs/
│       └── 2026-09-18-small-talk-gym-redesign-design.md
├── 产品策划与内容交接稿.md
├── 初阶Coach内容库.md
├── CLAUDE.md                          # 开发指南
└── package.json
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 设置 Supabase

1. 在 [supabase.com](https://supabase.com) 创建新项目
2. 在 SQL Editor 中运行 `supabase/schema.sql`
3. 创建 `.env` 文件：

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

4. 启用 Email Authentication（Magic Link）

详细步骤见 `supabase/README.md`

### 3. 本地开发

```bash
npm run dev
```

应用将在 http://localhost:5173 启动

### 4. 构建生产版本

```bash
npm run build
npm run preview
```

## 部署到 Vercel

### 方法 1: 通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel

# 添加环境变量
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# 生产部署
vercel --prod
```

### 方法 2: 通过 GitHub

1. 推送代码到 GitHub
2. 在 [vercel.com](https://vercel.com) 导入项目
3. 添加环境变量：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. 部署

## 部署 Supabase Edge Function

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录
supabase login

# 关联项目
supabase link --project-ref your_project_ref

# 设置 Claude API Key
supabase secrets set ANTHROPIC_API_KEY=your_claude_api_key

# 部署函数
supabase functions deploy simulator-chat
```

## 数据导入

目前应用使用内置的 fallback 数据（见 CoachCardPlayer.jsx）。

生产环境需要将内容导入 Supabase：

### Coach 初阶内容（20 张卡）

参考 `初阶Coach内容库.md`，将 5 个技能的 20 张卡片插入 `skill_cards` 表。

### Simulator 场景

创建场景主题和场景卡，插入 `scenario_themes` 和 `scene_cards` 表。

示例场景：
- 跨部门咖啡局 (5 个小情境)
- 会议开始前 (3 个小情境)
- 餐厅等位 (4 个小情境)

## 核心功能

### Coach（技能训练）
- ✅ 从数据库加载技能卡
- ✅ 选择题和文本输入支持
- ✅ 本地判分和反馈
- ✅ 进度追踪

### Simulator（场景模拟）
- ✅ AI 驱动的对话
- ✅ 场景边界机制（绿/黄/红灯）
- ✅ 本地 fallback（无需 API 也能演示）
- ✅ 对话轮数控制

### 认证
- ✅ Supabase Email Magic Link
- ✅ Row Level Security (RLS)
- ✅ 用户练习记录隔离

### UI/UX
- ✅ 蓝紫色渐变背景
- ✅ Claymorphism 软阴影卡片
- ✅ 响应式设计（手机优先）
- ✅ 流畅动画和过渡

## 产品原则（禁止违反）

1. **先看讯号，再开口** — 训练目标本身
2. **不做现场 Emergency Spotter** — 不是实时 AI 助手
3. **Coach 教原则，Simulator 练应用** — 两者不自动硬接
4. **不给对/错判分** — 给场景化解释
5. **Simulator 必须由场景卡约束** — 不是自由聊天
6. **内容必须数据化** — 不写死在代码里

详见 `产品策划与内容交接稿.md` 和 `CLAUDE.md`

## 待办事项

- [ ] 导入完整的 Coach 初阶内容到数据库
- [ ] 创建更多 Simulator 场景（目标 3 个主题，每个 3-5 场景）
- [ ] 测试 Edge Function 的 Claude API 集成
- [ ] 完善认证流程（登录/注册 UI）
- [ ] 添加插图素材（AI 生成或插画师）
- [ ] 10 人用户测试

## 开发指南

### 添加新技能卡

在 Supabase 的 `skill_cards` 表插入新行：

```sql
INSERT INTO skill_cards (level, skill_order, title, principle, when_not_to_use, scenario_text, choices)
VALUES (
  '初阶',
  6,
  '新技能标题',
  '一句话原理',
  '什么时候不要硬用',
  '场景描述文字',
  '[
    {"text": "选项A", "isCorrect": false, "feedback": "反馈A"},
    {"text": "选项B", "isCorrect": true, "feedback": "反馈B"}
  ]'::jsonb
);
```

### 添加新场景

1. 在 `scenario_themes` 表创建主题
2. 在 `scene_cards` 表添加具体场景卡
3. 确保填写所有必需字段（location, moment, relationships, current_thread, green_light, red_light）

### 修改 UI 样式

主要 CSS 变量在 `src/index.css`：

```css
:root {
  --ink: #171a3d;
  --muted: #676a86;
  --leaf: #5850ec;
  --sun: #ff805c;
  --bg-start: #bcd6f7;
  --bg-mid: #8fb8ef;
  --bg-end: #6f9de6;
}
```

## 许可证

ISC

## 支持

如有问题，请参考：
- `CLAUDE.md` - 开发者指南
- `产品策划与内容交接稿.md` - 产品方向
- `supabase/README.md` - 数据库设置
- `docs/superpowers/specs/2026-09-18-small-talk-gym-redesign-design.md` - 技术设计
