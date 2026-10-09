-- Small Talk Gym Database Schema
-- Based on design.md Section 4

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- skill_cards: Coach 技能卡
CREATE TABLE skill_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level TEXT NOT NULL CHECK (level IN ('初阶', '中阶', '高阶')),
  skill_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  principle TEXT NOT NULL,
  when_not_to_use TEXT NOT NULL,
  scenario_text TEXT NOT NULL,
  choices JSONB NOT NULL,
  illustration_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(level, skill_order)
);

-- scenario_themes: Simulator 大类场景
CREATE TABLE scenario_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('日常生活', '工作场合', '社交聚会', '专业表达')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category, title)
);

-- scene_cards: Simulator 具体小情境（一个 theme 下 3-5 张）
CREATE TABLE scene_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme_id UUID NOT NULL REFERENCES scenario_themes(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  moment TEXT NOT NULL,
  relationships TEXT NOT NULL,
  current_thread TEXT NOT NULL,
  goal TEXT NOT NULL,
  green_light TEXT NOT NULL,
  yellow_light TEXT,
  red_light TEXT NOT NULL,
  off_limits_notes TEXT,
  scene_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- practice_records: 用户练习记录
CREATE TABLE practice_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scene_card_id UUID REFERENCES scene_cards(id) ON DELETE SET NULL,
  skill_card_id UUID REFERENCES skill_cards(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_reflection_text TEXT,
  milestone_flag BOOLEAN DEFAULT FALSE,
  rating TEXT CHECK (rating IN ('easy', 'normal', 'hard')),
  CONSTRAINT practice_type_check CHECK (
    (scene_card_id IS NOT NULL AND skill_card_id IS NULL) OR
    (scene_card_id IS NULL AND skill_card_id IS NOT NULL)
  )
);

-- Row Level Security Policies
ALTER TABLE practice_records ENABLE ROW LEVEL SECURITY;

-- Users can only read their own practice records
CREATE POLICY "Users can view own practice records"
  ON practice_records FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own practice records
CREATE POLICY "Users can insert own practice records"
  ON practice_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Public read access for content tables (skill_cards, scenario_themes, scene_cards)
ALTER TABLE skill_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scene_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read skill_cards"
  ON skill_cards FOR SELECT
  USING (true);

CREATE POLICY "Public read scenario_themes"
  ON scenario_themes FOR SELECT
  USING (true);

CREATE POLICY "Public read scene_cards"
  ON scene_cards FOR SELECT
  USING (true);

-- Indexes for performance
CREATE INDEX idx_skill_cards_level_order ON skill_cards(level, skill_order);
CREATE INDEX idx_scenario_themes_category ON scenario_themes(category, display_order);
CREATE INDEX idx_scene_cards_theme ON scene_cards(theme_id, scene_order);
CREATE INDEX idx_practice_records_user ON practice_records(user_id, completed_at DESC);
CREATE INDEX idx_practice_records_scene ON practice_records(scene_card_id);
CREATE INDEX idx_practice_records_skill ON practice_records(skill_card_id);
