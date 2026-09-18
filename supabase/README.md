# Small Talk Gym - Supabase Setup Guide

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and anon key

## 2. Set Environment Variables

Create `.env` file:
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 3. Run Database Schema

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the content from `supabase/schema.sql`
3. Run the query

This creates:
- `skill_cards` - Coach 技能卡
- `scenario_themes` - Simulator 大类场景
- `scene_cards` - Simulator 具体小情境
- `practice_records` - 用户练习记录
- Row Level Security policies
- Indexes for performance

## 4. Enable Email Authentication

1. Go to Authentication → Providers
2. Enable "Email" provider
3. Disable email confirmation for testing (or configure SMTP)
4. Enable Magic Link

## 5. Deploy Edge Function (for Simulator AI)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your_project_ref

# Set the Claude API key secret
supabase secrets set ANTHROPIC_API_KEY=your_claude_api_key

# Deploy the function
supabase functions deploy simulator-chat
```

## 6. Import Initial Data

Use the Supabase Dashboard or create a migration script to import:
- Coach 初阶 content (20 cards from `初阶Coach内容库.md`)
- Simulator scenarios (starting with 跨部门咖啡局)

## Database Structure

### skill_cards
- `id` (UUID)
- `level` (初阶/中阶/高阶)
- `skill_order` (integer)
- `title` (text)
- `principle` (text)
- `when_not_to_use` (text)
- `scenario_text` (text)
- `choices` (jsonb)
- `illustration_url` (text, nullable)

### scenario_themes
- `id` (UUID)
- `category` (日常生活/工作场合/社交聚会/专业表达)
- `title` (text)
- `description` (text)
- `display_order` (integer)

### scene_cards
- `id` (UUID)
- `theme_id` (UUID → scenario_themes)
- `location`, `moment`, `relationships`, `current_thread`, `goal`
- `green_light`, `yellow_light`, `red_light`, `off_limits_notes`
- `scene_order` (integer)

### practice_records
- `id` (UUID)
- `user_id` (UUID → auth.users)
- `scene_card_id` or `skill_card_id` (one must be null)
- `completed_at` (timestamp)
- `user_reflection_text` (text, nullable)
- `milestone_flag` (boolean)
- `rating` (easy/normal/hard, nullable)

## Next Steps

1. Import content data into tables
2. Test authentication flow
3. Test Edge Function with a sample scene card
4. Build React components to consume the data
