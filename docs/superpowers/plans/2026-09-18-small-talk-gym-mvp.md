# Small Talk Gym MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the static `index.html` prototype into a real, data-driven Web app: 4-tab shell (今天/学习/练习/我的记录), a generic Coach card player, an AI-driven Simulator constrained by structured scene cards, Supabase auth/storage, deployed to Vercel for a 10-user test.

**Architecture:** React + TypeScript SPA (Vite) talks directly to Supabase (Postgres + Auth) from the client for reads/writes governed by Row Level Security, and calls a single Supabase Edge Function (`simulate-turn`) for every Simulator AI turn — the Edge Function assembles the system prompt from the scene card's structured fields and calls the Claude API server-side so the API key never reaches the browser.

**Tech Stack:** React 18, TypeScript, Vite, React Router v6, Vitest + @testing-library/react, @supabase/supabase-js v2, Supabase CLI (Postgres migrations + Deno Edge Functions), Claude API (Messages API), Vercel (hosting).

## Global Constraints

- Content (Coach cards, Simulator scene cards) lives in Supabase tables, never hardcoded per-card HTML/JS — see design.md §4.
- Coach never calls the AI; grading is local/deterministic — see design.md §5.
- Every Simulator AI turn's system prompt must include the scene card's location/moment/relationships/current_thread/green_light/yellow_light/red_light fields and the three-way boundary judgment (符合当前话题线 / 有点跳题但可接 / 明显越界) — see design.md §6 and CLAUDE.md.
- No "错了/失败" language in any feedback copy — scene-specific explanations only.
- Auth is Supabase email magic link, no passwords.
- UI follows the v6 design system from design.md §9.4: blue-violet gradient background, floating white cards/rows, pill buttons, semantic-color icon chips (green=done, blue=neutral, orange=new/attention). Illustration assets are out of scope for this plan (tracked separately per design.md §9.2).
- Do not invent new Simulator scene content beyond what design.md/交接稿/初阶Coach内容库.md already approved; Task 7's seed data is a literal structuring of the approved 跨部门咖啡局 narrative, not new creative writing.

---

## File Structure

```
small-talk-gym/
  src/
    main.tsx
    App.tsx                          # Router + tab shell
    lib/
      supabaseClient.ts              # Supabase client singleton
    styles/
      tokens.css                     # design system CSS variables + component classes
    components/
      layout/
        TabShell.tsx                 # 4-tab bottom nav + page outlet
      coach/
        CoachCardPlayer.tsx
        CoachCardPlayer.test.tsx
        grading.ts                   # pure grading logic
        grading.test.ts
      simulator/
        SimulatorChatPlayer.tsx
        SimulatorChatPlayer.test.tsx
        useSimulatorTurn.ts          # hook calling the Edge Function
    pages/
      TodayPage.tsx
      TodayPage.test.tsx
      CoachHubPage.tsx
      CoachHubPage.test.tsx
      CoachLevelPage.tsx
      SimulatorHubPage.tsx
      SimulatorThemePage.tsx
      SimulatorSessionPage.tsx
      ReflectionPage.tsx
      ReflectionPage.test.tsx
      RecordsPage.tsx
      RecordsPage.test.tsx
      LoginPage.tsx
      LoginPage.test.tsx
    auth/
      AuthProvider.tsx
      AuthProvider.test.tsx
      RequireAuth.tsx
    data/
      queries.ts                    # typed Supabase query functions
      queries.test.ts
      types.ts                      # shared DB row types
  supabase/
    migrations/
      0001_init_schema.sql
    functions/
      simulate-turn/
        index.ts                    # Deno HTTP handler
        prompt.ts                   # pure prompt-building + response-parsing (unit tested)
        prompt.test.ts
  scripts/
    seed-coach-content.ts
    seed-simulator-content.ts
  .env.example
  vite.config.ts
  vitest.config.ts
  package.json
  vercel.json
```

---

## Task 1: Project scaffold, design tokens, and tab shell

**Files:**
- Create: `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`
- Create: `src/styles/tokens.css`
- Create: `src/components/layout/TabShell.tsx`
- Test: `src/components/layout/TabShell.test.tsx`

**Interfaces:**
- Produces: `TabShell` component (no props) rendering an `<Outlet />` from `react-router-dom` plus a bottom nav with 4 `<NavLink>`s to `/today`, `/coach`, `/simulator`, `/records`.
- Produces: CSS classes in `tokens.css` used by every later component: `.stg-bg` (page gradient background), `.stg-slab` (floating card), `.stg-row` (list row), `.stg-row--done`, `.stg-icon` + `.stg-icon--green/--blue/--orange`, `.stg-btn`, `.stg-btn--primary`, `.stg-btn--ghost`, `.stg-tabbar`, `.stg-tabitem--active`.

- [ ] **Step 1: Scaffold the Vite + React + TypeScript project**

```bash
npm create vite@latest . -- --template react-ts
npm install react-router-dom @supabase/supabase-js
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @testing-library/user-event
```

- [ ] **Step 2: Configure Vitest**

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
    globals: true,
  },
});
```

`src/test-setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 3: Write the failing test for TabShell**

`src/components/layout/TabShell.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { TabShell } from "./TabShell";

function renderShell(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<TabShell />}>
          <Route path="/today" element={<div>Today Page</div>} />
          <Route path="/coach" element={<div>Coach Page</div>} />
          <Route path="/simulator" element={<div>Simulator Page</div>} />
          <Route path="/records" element={<div>Records Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

test("renders all four tab labels", () => {
  renderShell("/today");
  expect(screen.getByText("今天")).toBeInTheDocument();
  expect(screen.getByText("学习")).toBeInTheDocument();
  expect(screen.getByText("练习")).toBeInTheDocument();
  expect(screen.getByText("我的记录")).toBeInTheDocument();
});

test("renders the routed page content via Outlet", () => {
  renderShell("/coach");
  expect(screen.getByText("Coach Page")).toBeInTheDocument();
});

test("marks the active tab", () => {
  renderShell("/simulator");
  expect(screen.getByRole("link", { name: /练习/ })).toHaveClass("stg-tabitem--active");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/TabShell.test.tsx`
Expected: FAIL — `Cannot find module './TabShell'`

- [ ] **Step 3: Implement TabShell**

`src/components/layout/TabShell.tsx`:

```tsx
import { NavLink, Outlet } from "react-router-dom";

const TABS = [
  { to: "/today", label: "今天", icon: "🏠" },
  { to: "/coach", label: "学习", icon: "📖" },
  { to: "/simulator", label: "练习", icon: "💬" },
  { to: "/records", label: "我的记录", icon: "📔" },
];

export function TabShell() {
  return (
    <div className="stg-bg">
      <main className="stg-page">
        <Outlet />
      </main>
      <nav className="stg-tabbar">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              isActive ? "stg-tabitem stg-tabitem--active" : "stg-tabitem"
            }
          >
            <span className="stg-tabitem-icon">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
```

`src/styles/tokens.css` (design system from design.md §9.4, distilled from the approved v6 mockup):

```css
:root {
  --stg-bg-grad: linear-gradient(135deg, #bcd6f7, #8fb8ef 45%, #6f9de6 100%);
  --stg-slab-grad: linear-gradient(160deg, #eaf2fd, #cfe0f8);
  --stg-blue: #4364c9;
  --stg-blue-light: #6f8ee8;
  --stg-green: #3fae67;
  --stg-orange: #e3903f;
  --stg-text: #1c2f56;
  --stg-text-muted: #7c8fbd;
}

.stg-bg {
  min-height: 100vh;
  background: var(--stg-bg-grad);
  display: flex;
  flex-direction: column;
}

.stg-page { flex: 1; padding: 24px 18px 100px; }

.stg-slab {
  max-width: 420px;
  margin: 0 auto;
  background: var(--stg-slab-grad);
  border-radius: 32px;
  padding: 24px 20px;
  box-shadow: 0 4px 0 #a9c6ef, 0 30px 50px -18px rgba(20, 50, 110, 0.4),
    inset 0 2px 0 rgba(255, 255, 255, 0.9);
}

.stg-row {
  display: flex;
  align-items: center;
  gap: 11px;
  background: #fff;
  border-radius: 16px;
  padding: 11px 12px;
  box-shadow: 0 8px 16px rgba(50, 80, 160, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.stg-row--done {
  background: linear-gradient(160deg, #6c8cf0, #4364c9);
  color: #fff;
  box-shadow: 0 8px 16px rgba(30, 50, 120, 0.3);
}

.stg-icon {
  width: 32px; height: 32px; border-radius: 11px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; color: #fff;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.stg-icon--green { background: linear-gradient(160deg, #6bd08f, #3fae67); }
.stg-icon--blue { background: linear-gradient(160deg, #7d9df0, #5b7fe0); }
.stg-icon--orange { background: linear-gradient(160deg, #f7b26a, #e3903f); }

.stg-btn {
  border-radius: 20px; padding: 14px; text-align: center; font-weight: 900; font-size: 13px;
}
.stg-btn--primary {
  background: linear-gradient(160deg, var(--stg-blue-light), var(--stg-blue));
  color: #fff; box-shadow: 0 10px 18px rgba(20, 40, 110, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}
.stg-btn--ghost {
  background: #fff; color: #5b74a3;
  box-shadow: 0 8px 14px rgba(50, 80, 160, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.stg-tabbar {
  background: rgba(255, 255, 255, 0.75); backdrop-filter: blur(6px);
  margin: 0 12px 12px; border-radius: 22px; display: flex; justify-content: space-around;
  padding: 10px 4px 8px; box-shadow: 0 -6px 16px rgba(0, 0, 0, 0.06), 0 6px 14px rgba(0, 0, 0, 0.08);
  position: sticky; bottom: 0;
}
.stg-tabitem {
  display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: 11px;
  color: #a3835f; font-weight: 700; text-decoration: none;
}
.stg-tabitem--active { color: var(--stg-text); }
```

Wire `App.tsx` to route `TabShell` as the layout for `/today`, `/coach`, `/simulator`, `/records`, and import `tokens.css` in `main.tsx`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/layout/TabShell.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add package.json vite.config.ts vitest.config.ts tsconfig.json index.html src/main.tsx src/App.tsx src/test-setup.ts src/styles/tokens.css src/components/layout/TabShell.tsx src/components/layout/TabShell.test.tsx
git commit -m "feat: scaffold Vite/React app with design tokens and 4-tab shell"
```

---

## Task 2: Supabase schema migration

**Files:**
- Create: `supabase/migrations/0001_init_schema.sql`
- Create: `.env.example`

**Interfaces:**
- Produces: tables `skill_cards`, `scenario_themes`, `scene_cards`, `practice_records` with the columns from design.md §4, plus RLS policies restricting `practice_records` to `auth.uid() = user_id`.

- [ ] **Step 1: Write the migration SQL**

`supabase/migrations/0001_init_schema.sql`:

```sql
create table skill_cards (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('初阶', '中阶', '高阶')),
  skill_order int not null,
  title text not null,
  principle text not null,
  when_not_to_use text not null,
  scenario_text text not null,
  choices jsonb not null,
  illustration_url text,
  created_at timestamptz not null default now(),
  unique (level, skill_order)
);

create table scenario_themes (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('日常生活', '工作场合', '社交聚会', '专业表达')),
  title text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table scene_cards (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references scenario_themes(id) on delete cascade,
  scene_order int not null,
  location text not null,
  moment text not null,
  relationships text not null,
  current_thread text not null,
  goal text not null,
  green_light text not null,
  yellow_light text not null,
  red_light text not null,
  off_limits_notes text not null,
  created_at timestamptz not null default now(),
  unique (theme_id, scene_order)
);

create table practice_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_card_id uuid references skill_cards(id),
  scene_card_id uuid references scene_cards(id),
  completed_at timestamptz not null default now(),
  user_reflection_text text,
  milestone_flag boolean not null default false,
  check (
    (skill_card_id is not null and scene_card_id is null) or
    (skill_card_id is null and scene_card_id is not null)
  )
);

alter table skill_cards enable row level security;
alter table scenario_themes enable row level security;
alter table scene_cards enable row level security;
alter table practice_records enable row level security;

create policy "content is readable by any authenticated user"
  on skill_cards for select to authenticated using (true);
create policy "themes are readable by any authenticated user"
  on scenario_themes for select to authenticated using (true);
create policy "scenes are readable by any authenticated user"
  on scene_cards for select to authenticated using (true);

create policy "users read their own records"
  on practice_records for select to authenticated using (auth.uid() = user_id);
create policy "users insert their own records"
  on practice_records for insert to authenticated with check (auth.uid() = user_id);
```

- [ ] **Step 2: Apply the migration to a local Supabase instance**

Run: `npx supabase start` then `npx supabase db reset`
Expected: migration applies with no errors; `npx supabase db diff` shows no drift.

- [ ] **Step 3: Write `.env.example`**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_init_schema.sql .env.example
git commit -m "feat: add Supabase schema migration for content and practice records"
```

---

## Task 3: Supabase client, typed queries, and auth

**Files:**
- Create: `src/lib/supabaseClient.ts`
- Create: `src/data/types.ts`
- Create: `src/data/queries.ts`
- Test: `src/data/queries.test.ts`
- Create: `src/auth/AuthProvider.tsx`
- Test: `src/auth/AuthProvider.test.tsx`
- Create: `src/auth/RequireAuth.tsx`
- Create: `src/pages/LoginPage.tsx`
- Test: `src/pages/LoginPage.test.tsx`

**Interfaces:**
- Produces: `supabase` client singleton exported from `supabaseClient.ts`.
- Produces: `SkillCard`, `ScenarioTheme`, `SceneCard`, `PracticeRecord` types in `types.ts` matching the migration columns.
- Produces: `getSkillCards(level: string): Promise<SkillCard[]>`, `getScenarioThemes(): Promise<ScenarioTheme[]>`, `getSceneCards(themeId: string): Promise<SceneCard[]>`, `getPracticeRecords(userId: string): Promise<PracticeRecord[]>`, `insertPracticeRecord(record: NewPracticeRecord): Promise<PracticeRecord>` in `queries.ts`.
- Produces: `useAuth()` hook (from `AuthProvider`) returning `{ user: User | null, loading: boolean, signInWithEmail: (email: string) => Promise<void>, signOut: () => Promise<void> }`.
- Produces: `RequireAuth` component that redirects to `/login` when `user` is null.

- [ ] **Step 1: Create the Supabase client**

`src/lib/supabaseClient.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

- [ ] **Step 2: Define shared types**

`src/data/types.ts`:

```ts
export interface SkillCard {
  id: string;
  level: "初阶" | "中阶" | "高阶";
  skill_order: number;
  title: string;
  principle: string;
  when_not_to_use: string;
  scenario_text: string;
  choices: { text: string; correct: boolean; feedback: string }[];
  illustration_url: string | null;
}

export interface ScenarioTheme {
  id: string;
  category: "日常生活" | "工作场合" | "社交聚会" | "专业表达";
  title: string;
  description: string;
}

export interface SceneCard {
  id: string;
  theme_id: string;
  scene_order: number;
  location: string;
  moment: string;
  relationships: string;
  current_thread: string;
  goal: string;
  green_light: string;
  yellow_light: string;
  red_light: string;
  off_limits_notes: string;
}

export interface PracticeRecord {
  id: string;
  user_id: string;
  skill_card_id: string | null;
  scene_card_id: string | null;
  completed_at: string;
  user_reflection_text: string | null;
  milestone_flag: boolean;
}

export type NewPracticeRecord = Omit<PracticeRecord, "id" | "completed_at">;
```

- [ ] **Step 3: Write the failing test for queries**

`src/data/queries.test.ts`:

```ts
import { vi, describe, test, expect, beforeEach } from "vitest";

const mockFrom = vi.fn();
vi.mock("../lib/supabaseClient", () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

import { getSkillCards, insertPracticeRecord } from "./queries";

describe("getSkillCards", () => {
  beforeEach(() => mockFrom.mockReset());

  test("queries skill_cards filtered by level, ordered by skill_order", async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: "1" }], error: null });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    const result = await getSkillCards("初阶");

    expect(mockFrom).toHaveBeenCalledWith("skill_cards");
    expect(eq).toHaveBeenCalledWith("level", "初阶");
    expect(order).toHaveBeenCalledWith("skill_order", { ascending: true });
    expect(result).toEqual([{ id: "1" }]);
  });

  test("throws when Supabase returns an error", async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    const eq = vi.fn().mockReturnValue({ order });
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq }) });

    await expect(getSkillCards("初阶")).rejects.toThrow("boom");
  });
});

describe("insertPracticeRecord", () => {
  test("inserts and returns the created row", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "rec-1" }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    mockFrom.mockReturnValue({ insert });

    const result = await insertPracticeRecord({
      user_id: "u1",
      skill_card_id: "s1",
      scene_card_id: null,
      user_reflection_text: "还不错",
      milestone_flag: false,
    });

    expect(mockFrom).toHaveBeenCalledWith("practice_records");
    expect(insert).toHaveBeenCalledWith([
      { user_id: "u1", skill_card_id: "s1", scene_card_id: null, user_reflection_text: "还不错", milestone_flag: false },
    ]);
    expect(result).toEqual({ id: "rec-1" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/queries.test.ts`
Expected: FAIL — `Cannot find module './queries'`

- [ ] **Step 3: Implement queries**

`src/data/queries.ts`:

```ts
import { supabase } from "../lib/supabaseClient";
import type { SkillCard, ScenarioTheme, SceneCard, PracticeRecord, NewPracticeRecord } from "./types";

export async function getSkillCards(level: SkillCard["level"]): Promise<SkillCard[]> {
  const { data, error } = await supabase
    .from("skill_cards")
    .select("*")
    .eq("level", level)
    .order("skill_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data as SkillCard[];
}

export async function getScenarioThemes(): Promise<ScenarioTheme[]> {
  const { data, error } = await supabase.from("scenario_themes").select("*");
  if (error) throw new Error(error.message);
  return data as ScenarioTheme[];
}

export async function getSceneCards(themeId: string): Promise<SceneCard[]> {
  const { data, error } = await supabase
    .from("scene_cards")
    .select("*")
    .eq("theme_id", themeId)
    .order("scene_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data as SceneCard[];
}

export async function getPracticeRecords(userId: string): Promise<PracticeRecord[]> {
  const { data, error } = await supabase
    .from("practice_records")
    .select("*")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as PracticeRecord[];
}

export async function insertPracticeRecord(record: NewPracticeRecord): Promise<PracticeRecord> {
  const { data, error } = await supabase
    .from("practice_records")
    .insert([record])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PracticeRecord;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/queries.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing test for AuthProvider**

`src/auth/AuthProvider.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, test, expect } from "vitest";

const mockSignInWithOtp = vi.fn().mockResolvedValue({ error: null });
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null } });
const mockOnAuthStateChange = vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
      getSession: () => mockGetSession(),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      signOut: vi.fn(),
    },
  },
}));

import { AuthProvider, useAuth } from "./AuthProvider";

function Probe() {
  const { user, loading, signInWithEmail } = useAuth();
  return (
    <div>
      <span>loading:{String(loading)}</span>
      <span>user:{user ? user.email : "none"}</span>
      <button onClick={() => signInWithEmail("a@b.com")}>send link</button>
    </div>
  );
}

test("starts with no user once session check resolves", async () => {
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText("loading:false")).toBeInTheDocument());
  expect(screen.getByText("user:none")).toBeInTheDocument();
});

test("signInWithEmail calls supabase magic link with the given email", async () => {
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText("loading:false")).toBeInTheDocument());
  await userEvent.click(screen.getByText("send link"));
  expect(mockSignInWithOtp).toHaveBeenCalledWith({ email: "a@b.com" });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/auth/AuthProvider.test.tsx`
Expected: FAIL — `Cannot find module './AuthProvider'`

- [ ] **Step 7: Implement AuthProvider**

`src/auth/AuthProvider.tsx`:

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signInWithEmail(email: string) {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw new Error(error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/auth/AuthProvider.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 9: Implement RequireAuth and LoginPage (no new test framework needed beyond existing patterns)**

`src/auth/RequireAuth.tsx`:

```tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

`src/pages/LoginPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, test, expect } from "vitest";
import { LoginPage } from "./LoginPage";

const mockSignIn = vi.fn().mockResolvedValue(undefined);
vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ signInWithEmail: mockSignIn }),
}));

test("submits the entered email to signInWithEmail", async () => {
  render(<LoginPage />);
  await userEvent.type(screen.getByPlaceholderText("你的邮箱"), "amir@example.com");
  await userEvent.click(screen.getByText("发送登录链接"));
  expect(mockSignIn).toHaveBeenCalledWith("amir@example.com");
});

test("shows a confirmation message after sending", async () => {
  render(<LoginPage />);
  await userEvent.type(screen.getByPlaceholderText("你的邮箱"), "amir@example.com");
  await userEvent.click(screen.getByText("发送登录链接"));
  expect(await screen.findByText(/登录链接已发送/)).toBeInTheDocument();
});
```

Run: `npx vitest run src/pages/LoginPage.test.tsx` → Expected: FAIL (module missing)

`src/pages/LoginPage.tsx`:

```tsx
import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";

export function LoginPage() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await signInWithEmail(email);
    setSent(true);
  }

  return (
    <div className="stg-slab">
      <h1>登录 Small Talk Gym</h1>
      <form onSubmit={handleSubmit}>
        <input
          className="stg-input"
          placeholder="你的邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />
        <button className="stg-btn stg-btn--primary" type="submit">发送登录链接</button>
      </form>
      {sent && <p>登录链接已发送，去邮箱里点一下就好。</p>}
    </div>
  );
}
```

Run: `npx vitest run src/pages/LoginPage.test.tsx` → Expected: PASS (2 tests)

- [ ] **Step 10: Commit**

```bash
git add src/lib/supabaseClient.ts src/data src/auth src/pages/LoginPage.tsx src/pages/LoginPage.test.tsx
git commit -m "feat: add Supabase client, typed queries, and magic-link auth"
```

---

## Task 4: Seed Coach content (初阶 5 skills)

**Files:**
- Create: `scripts/seed-coach-content.ts`
- Test: `scripts/seed-coach-content.test.ts`

**Interfaces:**
- Consumes: `SkillCard` type from `src/data/types.ts`.
- Produces: exported `coachSeedData: Omit<SkillCard, "id">[]` array (5 entries, one per skill in 初阶Coach内容库.md) and a `seedCoachContent(supabaseAdmin): Promise<void>` function that upserts them.

- [ ] **Step 1: Write the failing test for the seed data shape**

`scripts/seed-coach-content.test.ts`:

```ts
import { test, expect } from "vitest";
import { coachSeedData } from "./seed-coach-content";

test("contains exactly the 5 初阶 skills in order", () => {
  expect(coachSeedData).toHaveLength(5);
  expect(coachSeedData.map((c) => c.skill_order)).toEqual([1, 2, 3, 4, 5]);
  expect(coachSeedData.every((c) => c.level === "初阶")).toBe(true);
});

test("every card has a non-empty when_not_to_use (safety requirement)", () => {
  for (const card of coachSeedData) {
    expect(card.when_not_to_use.length).toBeGreaterThan(0);
  }
});

test("every card has at least one correct and one incorrect choice", () => {
  for (const card of coachSeedData) {
    expect(card.choices.some((c) => c.correct)).toBe(true);
    expect(card.choices.some((c) => !c.correct)).toBe(true);
  }
});

test("skill 3 matches the approved 初阶Coach内容库.md content", () => {
  const skill3 = coachSeedData.find((c) => c.skill_order === 3)!;
  expect(skill3.title).toBe("问一句，也给一点自己");
  expect(skill3.scenario_text).toContain("你平时喝不喝咖啡");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/seed-coach-content.test.ts`
Expected: FAIL — `Cannot find module './seed-coach-content'`

- [ ] **Step 3: Implement the seed data, transcribed from 初阶Coach内容库.md**

`scripts/seed-coach-content.ts`:

```ts
import type { SkillCard } from "../src/data/types";

type SeedCard = Omit<SkillCard, "id">;

export const coachSeedData: SeedCard[] = [
  {
    level: "初阶",
    skill_order: 1,
    title: "先看开口时机",
    principle: "不是每个安静都需要填满；先看对方有没有空、有没有回应、有没有互动机会。",
    when_not_to_use: "对方戴耳机、低头赶事、明显封闭、短答或回避眼神时。",
    scenario_text: "同一栋办公楼的陌生人对你微笑说 Good morning。",
    choices: [
      { text: "轻轻接住问候，说一句 Good morning 回应", correct: true, feedback: "对。这是绿灯——对方主动问候，轻轻接住就好，不必追加私人问题。" },
      { text: "顺势问对方在哪个部门、叫什么名字", correct: false, feedback: "对方只是礼貌问候，还没给出继续聊下去的许可，追问会显得太快。" },
    ],
    illustration_url: null,
  },
  {
    level: "初阶",
    skill_order: 2,
    title: "共同情境开场",
    principle: "有绿灯后，不必想聪明话题；从你们共同看见、共同经历的事开始。",
    when_not_to_use: "对方没有开口许可，或对方明显忙碌时。",
    scenario_text: "大家刚坐下，旁边同事提到自己不知道点什么饮品。",
    choices: [
      { text: "接住饮品话题，说说自己常点的东西，顺便问对方想试试什么", correct: true, feedback: "对。你从共同看得到的菜单开始，不跳去无关话题。" },
      { text: "转而聊起今天开会的议程安排", correct: false, feedback: "跳开了当下的饮品话题，对方可能还没准备好换话题。" },
    ],
    illustration_url: null,
  },
  {
    level: "初阶",
    skill_order: 3,
    title: "问一句，也给一点自己",
    principle: "只发问像审问；只讲自己像独白。给一点自己的信息，再把球传回去。",
    when_not_to_use: "不必透露私人、敏感或不舒服的信息。",
    scenario_text: "新同事问你：你平时喝不喝咖啡？",
    choices: [
      { text: "有，不过我常喝 Americano，不太喜欢甜的。你呢？", correct: true, feedback: "对。你回答了问题、给了一个小细节，也让对方容易接话。" },
      { text: "有。", correct: false, feedback: "只回答了问题本身，没有给对方可以接着聊的钩子，对话容易断掉。" },
    ],
    illustration_url: "conversation-balance.png",
  },
  {
    level: "初阶",
    skill_order: 4,
    title: "抓关键词接话",
    principle: "不急着换成自己的故事；先抓住对方刚说的一个词，往下接一层。",
    when_not_to_use: "对方只给非常短的答复、明显想结束时，不要连环追问。",
    scenario_text: "对方说：我周末去跑步了。",
    choices: [
      { text: "你通常跑哪里？我最近也想多走走。", correct: true, feedback: "对。你接住了「跑步」，再往下问一层。" },
      { text: "我最近工作很忙。", correct: false, feedback: "换成了自己的话题，没有接住对方刚说的「跑步」。" },
    ],
    illustration_url: "follow-keyword.png",
  },
  {
    level: "初阶",
    skill_order: 5,
    title: "自然收尾",
    principle: "对话不是一定要聊长；知道怎样离开，会让开口变得更轻。",
    when_not_to_use: "对方短答、看回手机、身体转开、活动要开始，或话题自然结束时才用；聊得正好时不需要硬找理由结束。",
    scenario_text: "主持人准备开始会议，对方也转向会议室。",
    choices: [
      { text: "很高兴认识你，等会儿再聊。", correct: true, feedback: "对。你读到场合变化，也给了双方舒服的结束。" },
      { text: "继续追问：你周末到底做了什么？", correct: false, feedback: "没有读到场合已经变化，硬续话题会让对方为难。" },
    ],
    illustration_url: "natural-close.png",
  },
];

export async function seedCoachContent(
  client: { from: (table: string) => { upsert: (rows: unknown[], opts: unknown) => Promise<{ error: { message: string } | null }> } }
): Promise<void> {
  const { error } = await client
    .from("skill_cards")
    .upsert(coachSeedData, { onConflict: "level,skill_order" });
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/seed-coach-content.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-coach-content.ts scripts/seed-coach-content.test.ts
git commit -m "feat: seed 初阶 Coach content transcribed from 初阶Coach内容库.md"
```

---

## Task 5: Coach grading logic + CoachCardPlayer

**Files:**
- Create: `src/components/coach/grading.ts`
- Test: `src/components/coach/grading.test.ts`
- Create: `src/components/coach/CoachCardPlayer.tsx`
- Test: `src/components/coach/CoachCardPlayer.test.tsx`

**Interfaces:**
- Consumes: `SkillCard` type from `src/data/types.ts`.
- Produces: `gradeChoice(card: SkillCard, choiceIndex: number): { correct: boolean; feedback: string }` in `grading.ts`.
- Produces: `CoachCardPlayer` component with props `{ cards: SkillCard[]; onLevelComplete: () => void }`.

- [ ] **Step 1: Write the failing test for grading**

`src/components/coach/grading.test.ts`:

```ts
import { test, expect } from "vitest";
import { gradeChoice } from "./grading";
import type { SkillCard } from "../../data/types";

const card: SkillCard = {
  id: "1", level: "初阶", skill_order: 1, title: "t", principle: "p",
  when_not_to_use: "w", scenario_text: "s", illustration_url: null,
  choices: [
    { text: "A", correct: true, feedback: "good" },
    { text: "B", correct: false, feedback: "not quite" },
  ],
};

test("returns correct:true and the matching feedback for the right choice", () => {
  expect(gradeChoice(card, 0)).toEqual({ correct: true, feedback: "good" });
});

test("returns correct:false and the matching feedback for the wrong choice", () => {
  expect(gradeChoice(card, 1)).toEqual({ correct: false, feedback: "not quite" });
});

test("throws on an out-of-range index", () => {
  expect(() => gradeChoice(card, 5)).toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/coach/grading.test.ts`
Expected: FAIL — `Cannot find module './grading'`

- [ ] **Step 3: Implement grading**

`src/components/coach/grading.ts`:

```ts
import type { SkillCard } from "../../data/types";

export function gradeChoice(card: SkillCard, choiceIndex: number): { correct: boolean; feedback: string } {
  const choice = card.choices[choiceIndex];
  if (!choice) throw new Error(`No choice at index ${choiceIndex}`);
  return { correct: choice.correct, feedback: choice.feedback };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/coach/grading.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing test for CoachCardPlayer**

`src/components/coach/CoachCardPlayer.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, test, expect } from "vitest";
import { CoachCardPlayer } from "./CoachCardPlayer";
import type { SkillCard } from "../../data/types";

const cards: SkillCard[] = [
  {
    id: "1", level: "初阶", skill_order: 1, title: "技能一", principle: "原理一",
    when_not_to_use: "别用的时候一", scenario_text: "场景一", illustration_url: null,
    choices: [
      { text: "选A", correct: true, feedback: "反馈A" },
      { text: "选B", correct: false, feedback: "反馈B" },
    ],
  },
  {
    id: "2", level: "初阶", skill_order: 2, title: "技能二", principle: "原理二",
    when_not_to_use: "别用的时候二", scenario_text: "场景二", illustration_url: null,
    choices: [
      { text: "选C", correct: true, feedback: "反馈C" },
      { text: "选D", correct: false, feedback: "反馈D" },
    ],
  },
];

test("shows the first card's principle and scenario", () => {
  render(<CoachCardPlayer cards={cards} onLevelComplete={vi.fn()} />);
  expect(screen.getByText("原理一")).toBeInTheDocument();
  expect(screen.getByText("场景一")).toBeInTheDocument();
});

test("shows scene-specific feedback text, never 错了/失败, after picking wrong", async () => {
  render(<CoachCardPlayer cards={cards} onLevelComplete={vi.fn()} />);
  await userEvent.click(screen.getByText("选B"));
  expect(screen.getByText("反馈B")).toBeInTheDocument();
  expect(screen.queryByText(/错了/)).not.toBeInTheDocument();
  expect(screen.queryByText(/失败/)).not.toBeInTheDocument();
});

test("advances to the next card after clicking 下一张", async () => {
  render(<CoachCardPlayer cards={cards} onLevelComplete={vi.fn()} />);
  await userEvent.click(screen.getByText("选A"));
  await userEvent.click(screen.getByText("下一张"));
  expect(screen.getByText("原理二")).toBeInTheDocument();
});

test("calls onLevelComplete after the last card is answered and advanced", async () => {
  const onComplete = vi.fn();
  render(<CoachCardPlayer cards={cards} onLevelComplete={onComplete} />);
  await userEvent.click(screen.getByText("选A"));
  await userEvent.click(screen.getByText("下一张"));
  await userEvent.click(screen.getByText("选C"));
  await userEvent.click(screen.getByText("完成本阶"));
  expect(onComplete).toHaveBeenCalled();
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/components/coach/CoachCardPlayer.test.tsx`
Expected: FAIL — `Cannot find module './CoachCardPlayer'`

- [ ] **Step 7: Implement CoachCardPlayer**

`src/components/coach/CoachCardPlayer.tsx`:

```tsx
import { useState } from "react";
import type { SkillCard } from "../../data/types";
import { gradeChoice } from "./grading";

export function CoachCardPlayer({
  cards,
  onLevelComplete,
}: {
  cards: SkillCard[];
  onLevelComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const card = cards[index];
  const isLast = index === cards.length - 1;

  function handleChoice(choiceIndex: number) {
    const result = gradeChoice(card, choiceIndex);
    setFeedback(result.feedback);
  }

  function handleNext() {
    if (isLast) {
      onLevelComplete();
      return;
    }
    setIndex((i) => i + 1);
    setFeedback(null);
  }

  return (
    <div className="stg-slab">
      <p className="stg-eyebrow">技能 {card.skill_order}／{cards.length}</p>
      <h2>{card.title}</h2>
      <p>{card.principle}</p>
      <p className="stg-when-not">什么时候不要硬用：{card.when_not_to_use}</p>
      <div className="stg-row">{card.scenario_text}</div>
      <div className="stg-choices">
        {card.choices.map((choice, i) => (
          <button key={choice.text} className="stg-btn stg-btn--ghost" onClick={() => handleChoice(i)}>
            {choice.text}
          </button>
        ))}
      </div>
      {feedback && (
        <>
          <p className="stg-feedback">{feedback}</p>
          <button className="stg-btn stg-btn--primary" onClick={handleNext}>
            {isLast ? "完成本阶" : "下一张"}
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/components/coach/CoachCardPlayer.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 9: Commit**

```bash
git add src/components/coach
git commit -m "feat: add Coach grading logic and generic CoachCardPlayer component"
```

---

## Task 6: Coach hub and level page with unlock logic

**Files:**
- Create: `src/pages/CoachHubPage.tsx`
- Test: `src/pages/CoachHubPage.test.tsx`
- Create: `src/pages/CoachLevelPage.tsx`

**Interfaces:**
- Consumes: `getSkillCards`, `getPracticeRecords` from `src/data/queries.ts`; `CoachCardPlayer` from Task 5; `useAuth` from Task 3.
- Produces: `CoachHubPage` showing 初阶/中阶/高阶 rows, 中阶/高阶 locked until all 初阶 cards have a matching `practice_records` row.

- [ ] **Step 1: Write the failing test for level unlock logic**

`src/pages/CoachHubPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, test, expect } from "vitest";

vi.mock("../data/queries", () => ({
  getSkillCards: vi.fn(async (level: string) =>
    level === "初阶" ? [{ id: "s1" }, { id: "s2" }] : [{ id: "m1" }]
  ),
  getPracticeRecords: vi.fn(async () => [{ id: "r1", skill_card_id: "s1" }]),
}));
vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

import { CoachHubPage } from "./CoachHubPage";

test("marks 中阶 as locked when not all 初阶 cards are completed", async () => {
  render(<MemoryRouter><CoachHubPage /></MemoryRouter>);
  expect(await screen.findByText("初阶")).toBeInTheDocument();
  expect(screen.getByText("中阶").closest("a,button")).toHaveAttribute("aria-disabled", "true");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/CoachHubPage.test.tsx`
Expected: FAIL — `Cannot find module './CoachHubPage'`

- [ ] **Step 3: Implement CoachHubPage**

`src/pages/CoachHubPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSkillCards, getPracticeRecords } from "../data/queries";
import { useAuth } from "../auth/AuthProvider";

const LEVELS = ["初阶", "中阶", "高阶"] as const;

export function CoachHubPage() {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set(["初阶"]));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const beginnerCards = await getSkillCards("初阶");
      const records = await getPracticeRecords(user.id);
      const completedIds = new Set(records.map((r) => r.skill_card_id));
      const beginnerDone = beginnerCards.every((c) => completedIds.has(c.id));

      const next = new Set(["初阶"]);
      if (beginnerDone) next.add("中阶");
      setUnlocked(next);
      setLoaded(true);
    })();
  }, [user]);

  if (!loaded) return null;

  return (
    <div className="stg-slab">
      <h1>选一个训练等级</h1>
      {LEVELS.map((level) => {
        const isUnlocked = unlocked.has(level);
        return isUnlocked ? (
          <Link key={level} to={`/coach/${level}`} className="stg-row" aria-disabled="false">
            {level}
          </Link>
        ) : (
          <span key={level} className="stg-row" aria-disabled="true" style={{ opacity: 0.5 }}>
            {level}
          </span>
        );
      })}
    </div>
  );
}
```

`src/pages/CoachLevelPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSkillCards, insertPracticeRecord } from "../data/queries";
import { CoachCardPlayer } from "../components/coach/CoachCardPlayer";
import { useAuth } from "../auth/AuthProvider";
import type { SkillCard } from "../data/types";

export function CoachLevelPage() {
  const { level } = useParams<{ level: SkillCard["level"] }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<SkillCard[] | null>(null);

  useEffect(() => {
    if (!level) return;
    getSkillCards(level).then(setCards);
  }, [level]);

  if (!cards || !user) return null;

  async function handleComplete() {
    for (const card of cards!) {
      await insertPracticeRecord({
        user_id: user!.id,
        skill_card_id: card.id,
        scene_card_id: null,
        user_reflection_text: null,
        milestone_flag: false,
      });
    }
    navigate("/coach");
  }

  return <CoachCardPlayer cards={cards} onLevelComplete={handleComplete} />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/CoachHubPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Wire routes and commit**

Add `/coach` → `CoachHubPage`, `/coach/:level` → `CoachLevelPage` to `App.tsx`.

```bash
git add src/pages/CoachHubPage.tsx src/pages/CoachHubPage.test.tsx src/pages/CoachLevelPage.tsx src/App.tsx
git commit -m "feat: add Coach hub with level unlock logic"
```

---

## Task 7: Seed Simulator content (跨部门咖啡局 theme)

**Files:**
- Create: `scripts/seed-simulator-content.ts`
- Test: `scripts/seed-simulator-content.test.ts`

**Interfaces:**
- Consumes: `ScenarioTheme`, `SceneCard` types from `src/data/types.ts`.
- Produces: `themeSeedData: Omit<ScenarioTheme, "id">`, `sceneSeedData: (themeId: string) => Omit<SceneCard, "id" | "theme_id">[]` (5 entries, structured from 交接稿 §6/§7's approved 跨部门咖啡局 narrative — not new content).

- [ ] **Step 1: Write the failing test**

`scripts/seed-simulator-content.test.ts`:

```ts
import { test, expect } from "vitest";
import { themeSeedData, sceneSeedData } from "./seed-simulator-content";

test("theme matches the approved 跨部门咖啡局 example", () => {
  expect(themeSeedData.category).toBe("工作场合");
  expect(themeSeedData.title).toBe("跨部门咖啡局");
});

test("produces 5 ordered scene cards, each with all boundary fields filled", () => {
  const scenes = sceneSeedData("theme-1");
  expect(scenes).toHaveLength(5);
  expect(scenes.map((s) => s.scene_order)).toEqual([1, 2, 3, 4, 5]);
  for (const scene of scenes) {
    expect(scene.green_light.length).toBeGreaterThan(0);
    expect(scene.yellow_light.length).toBeGreaterThan(0);
    expect(scene.red_light.length).toBeGreaterThan(0);
    expect(scene.current_thread.length).toBeGreaterThan(0);
  }
});

test("scene 1 matches the fully-specified example from 交接稿 §7", () => {
  const scene1 = sceneSeedData("theme-1")[0];
  expect(scene1.moment).toContain("刚点好饮料");
  expect(scene1.current_thread).toContain("桌上的饮品");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/seed-simulator-content.test.ts`
Expected: FAIL — `Cannot find module './seed-simulator-content'`

- [ ] **Step 3: Implement the seed data**

`scripts/seed-simulator-content.ts`:

```ts
import type { ScenarioTheme, SceneCard } from "../src/data/types";

type ThemeSeed = Omit<ScenarioTheme, "id">;
type SceneSeed = Omit<SceneCard, "id" | "theme_id">;

export const themeSeedData: ThemeSeed = {
  category: "工作场合",
  title: "跨部门咖啡局",
  description: "同一个咖啡局主题下的不同小情境：先开口、重新开场、加入对话、自然接话、自然收尾。",
};

export function sceneSeedData(_themeId: string): SceneSeed[] {
  const commonRedLight = "对方戴耳机、明显在处理工作消息、身体转开、只给短答且不追问回来。";
  return [
    {
      scene_order: 1,
      location: "公司附近的咖啡厅",
      moment: "大家刚点好饮料、坐下来。熟同事正在和另一位同事聊天。",
      relationships: "坐在你旁边的跨部门同事；你们刚互相介绍过，还没有聊起来。",
      current_thread: "桌上的饮品、今天的安排、彼此的轻量认识。",
      goal: "由你先开口，从桌上的饮品或今天的安排说起，问一个轻量的问题。",
      green_light: "对方点了和你类似的饮品、看向你、周围气氛轻松。",
      yellow_light: "对方礼貌微笑但没有主动开口，可以轻轻起个头，没接就停。",
      red_light: commonRedLight,
      off_limits_notes: "不问薪资、汇报关系等敏感工作信息；不追问私人感情状况。",
    },
    {
      scene_order: 2,
      location: "同一家咖啡厅",
      moment: "你偶遇之前聊过一次、但还不熟的跨部门同事，两人都在等咖啡。",
      relationships: "之前活动上聊过一次的跨部门同事，属于「认识但不熟」的关系。",
      current_thread: "重新认出彼此、简单延续上次的印象。",
      goal: "practice 重新开场：从「我们见过」这件事本身自然切入，不必假装完全陌生。",
      green_light: "对方认出你、露出微笑或打招呼。",
      yellow_light: "对方表情中性、不确定是否记得你，可以主动提醒上次见面的场景，没接就停。",
      red_light: commonRedLight,
      off_limits_notes: "不追问对方是否记得自己的细节到尴尬程度；不过度解释上次为何没加联系方式。",
    },
    {
      scene_order: 3,
      location: "咖啡局的桌边",
      moment: "熟同事带来一位你完全不认识的人，三人正站着聊了几句。",
      relationships: "熟同事 + 一位全新的陌生人，对话已经开始了一小段。",
      current_thread: "熟同事和陌生人正在聊的那个话题（如周末活动、公司八卦级别的轻话题）。",
      goal: "练习加入一段已经开始的对话：先听一句，再顺着当前话题接一层，不要突然抛出新话题抢注意力。",
      green_light: "熟同事在讲话间隙看向你，像是邀请你加入。",
      yellow_light: "对话正热烈，可以先点头/微笑表示在场，等一个自然停顿再接话。",
      red_light: "两人正在讨论明显私密或严肃的话题（如某人的困难处境）；此时不要插入轻松话题。",
      off_limits_notes: "不要打断正在说话的人；不对不了解的话题背景强行评论。",
    },
    {
      scene_order: 4,
      location: "咖啡厅座位",
      moment: "对方主动先问了你一句关于今天安排或饮品的问题。",
      relationships: "跨部门同事，刚坐下不久。",
      current_thread: "对方提出的那个问题本身。",
      goal: "练习自然接话：先正面回答，给一点自己的细节，再把问题传回给对方（呼应 Coach 技能 3）。",
      green_light: "对方主动提问，语气轻松、带着好奇。",
      yellow_light: "问题略泛泛，可以先给一个具体小细节再看对方反应。",
      red_light: commonRedLight,
      off_limits_notes: "回答不必过度详细或私人，一两句具体细节即可。",
    },
    {
      scene_order: 5,
      location: "咖啡厅座位",
      moment: "已经来回聊了两三轮，饮料也送到了，气氛还不错。",
      relationships: "跨部门同事，这次对话进行得比较顺利。",
      current_thread: "当前聊天的自然结尾点（饮料到了、需要各自回座位）。",
      goal: "练习「聊得不错也能收尾」：不需要硬撑到活动结束，感谢/祝对方享受，再自然离开。",
      green_light: "对话进行顺利，双方都有来有回。",
      yellow_light: "对话开始变短但气氛仍友善，可以主动收尾而不是等对方先走。",
      red_light: "对方仍在积极延续话题时，不要突兀地立刻离开——先给一句自然的过渡。",
      off_limits_notes: "收尾不需要过度煽情或承诺「下次一起吃饭」等超出这次关系的话。",
    },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/seed-simulator-content.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-simulator-content.ts scripts/seed-simulator-content.test.ts
git commit -m "feat: seed 跨部门咖啡局 theme with 5 structured scene cards"
```

---

## Task 8: Simulator hub and theme/scene selection pages

**Files:**
- Create: `src/pages/SimulatorHubPage.tsx`
- Create: `src/pages/SimulatorThemePage.tsx`
- Test: `src/pages/SimulatorThemePage.test.tsx`

**Interfaces:**
- Consumes: `getScenarioThemes`, `getSceneCards`, `getPracticeRecords` from `src/data/queries.ts`.
- Produces: `SimulatorThemePage` that lists scene cards for a theme, shows a small `x/5` counter per交接稿 §10, and defaults to recommending an unpracticed scene.

- [ ] **Step 1: Write the failing test**

`src/pages/SimulatorThemePage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, test, expect } from "vitest";

vi.mock("../data/queries", () => ({
  getSceneCards: vi.fn(async () => [
    { id: "sc1", scene_order: 1, location: "咖啡厅" },
    { id: "sc2", scene_order: 2, location: "咖啡厅" },
  ]),
  getPracticeRecords: vi.fn(async () => [{ id: "r1", scene_card_id: "sc1" }]),
}));
vi.mock("../auth/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));

import { SimulatorThemePage } from "./SimulatorThemePage";

test("shows a 1/2 practiced counter", async () => {
  render(
    <MemoryRouter initialEntries={["/simulator/theme-1"]}>
      <Routes><Route path="/simulator/:themeId" element={<SimulatorThemePage />} /></Routes>
    </MemoryRouter>
  );
  expect(await screen.findByText("1/2")).toBeInTheDocument();
});

test("recommends the unpracticed scene card first", async () => {
  render(
    <MemoryRouter initialEntries={["/simulator/theme-1"]}>
      <Routes><Route path="/simulator/:themeId" element={<SimulatorThemePage />} /></Routes>
    </MemoryRouter>
  );
  const recommended = await screen.findByText("推荐：新情境");
  expect(recommended).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/SimulatorThemePage.test.tsx`
Expected: FAIL — `Cannot find module './SimulatorThemePage'`

- [ ] **Step 3: Implement SimulatorHubPage and SimulatorThemePage**

`src/pages/SimulatorHubPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getScenarioThemes } from "../data/queries";
import type { ScenarioTheme } from "../data/types";

export function SimulatorHubPage() {
  const [themes, setThemes] = useState<ScenarioTheme[]>([]);

  useEffect(() => {
    getScenarioThemes().then(setThemes);
  }, []);

  return (
    <div className="stg-slab">
      <h1>选一个你想练的场景</h1>
      {themes.map((theme) => (
        <Link key={theme.id} to={`/simulator/${theme.id}`} className="stg-row">
          <div>
            <div>{theme.title}</div>
            <div className="stg-row-desc">{theme.description}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
```

`src/pages/SimulatorThemePage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSceneCards, getPracticeRecords } from "../data/queries";
import { useAuth } from "../auth/AuthProvider";
import type { SceneCard } from "../data/types";

export function SimulatorThemePage() {
  const { themeId } = useParams<{ themeId: string }>();
  const { user } = useAuth();
  const [scenes, setScenes] = useState<SceneCard[] | null>(null);
  const [practicedIds, setPracticedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!themeId || !user) return;
    (async () => {
      const [sceneList, records] = await Promise.all([
        getSceneCards(themeId),
        getPracticeRecords(user.id),
      ]);
      setScenes(sceneList);
      setPracticedIds(new Set(records.map((r) => r.scene_card_id).filter(Boolean) as string[]));
    })();
  }, [themeId, user]);

  if (!scenes) return null;

  const recommended = scenes.find((s) => !practicedIds.has(s.id)) ?? scenes[0];

  return (
    <div className="stg-slab">
      <p>{practicedIds.size}/{scenes.length}</p>
      <h1>选一个小情境</h1>
      {scenes.map((scene) => (
        <Link key={scene.id} to={`/simulator/session/${scene.id}`} className="stg-row">
          {scene.id === recommended.id && !practicedIds.has(scene.id) && <span>推荐：新情境</span>}
          <span>{scene.location} · {practicedIds.has(scene.id) ? "已练过" : "未练过"}</span>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/SimulatorThemePage.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Wire routes and commit**

Add `/simulator` → `SimulatorHubPage`, `/simulator/:themeId` → `SimulatorThemePage` to `App.tsx`.

```bash
git add src/pages/SimulatorHubPage.tsx src/pages/SimulatorThemePage.tsx src/pages/SimulatorThemePage.test.tsx src/App.tsx
git commit -m "feat: add Simulator hub and theme scene-selection page"
```

---

## Task 9: `simulate-turn` Edge Function — prompt assembly and boundary judgment

**Files:**
- Create: `supabase/functions/simulate-turn/prompt.ts`
- Test: `supabase/functions/simulate-turn/prompt.test.ts`
- Create: `supabase/functions/simulate-turn/index.ts`

**Interfaces:**
- Consumes: `SceneCard` type (duplicated locally since Edge Functions run in Deno and can't import from `src/`).
- Produces: `buildSystemPrompt(scene: SceneCard): string`, `parseModelResponse(raw: string): { reply: string; judgment: "on_thread" | "borderline" | "off_limits"; coach_tip: string | null }` — both pure functions, unit-tested with Vitest before wiring into the Deno handler.

- [ ] **Step 1: Write the failing test for buildSystemPrompt**

`supabase/functions/simulate-turn/prompt.test.ts`:

```ts
import { test, expect } from "vitest";
import { buildSystemPrompt, parseModelResponse } from "./prompt";

const scene = {
  location: "公司附近的咖啡厅",
  moment: "大家刚点好饮料、坐下来。",
  relationships: "坐在你旁边的跨部门同事。",
  current_thread: "桌上的饮品、今天的安排。",
  green_light: "对方点了类似饮品、看向你。",
  yellow_light: "对方礼貌微笑但没主动开口。",
  red_light: "对方戴耳机、明显在处理工作消息。",
  off_limits_notes: "不问薪资；不追问私人感情状况。",
};

test("includes every scene field in the system prompt", () => {
  const prompt = buildSystemPrompt(scene);
  for (const value of Object.values(scene)) {
    expect(prompt).toContain(value);
  }
});

test("instructs the three-way boundary judgment", () => {
  const prompt = buildSystemPrompt(scene);
  expect(prompt).toContain("on_thread");
  expect(prompt).toContain("borderline");
  expect(prompt).toContain("off_limits");
});

test("forbids 错了/失败 language in the instructions", () => {
  const prompt = buildSystemPrompt(scene);
  expect(prompt).toContain("不说\"错了\"");
});

test("parseModelResponse extracts reply, judgment, and coach_tip from valid JSON", () => {
  const raw = JSON.stringify({ reply: "还好，你呢？", judgment: "on_thread", coach_tip: null });
  expect(parseModelResponse(raw)).toEqual({ reply: "还好，你呢？", judgment: "on_thread", coach_tip: null });
});

test("parseModelResponse throws on malformed JSON", () => {
  expect(() => parseModelResponse("not json")).toThrow();
});

test("parseModelResponse throws when judgment is not one of the three allowed values", () => {
  const raw = JSON.stringify({ reply: "x", judgment: "weird", coach_tip: null });
  expect(() => parseModelResponse(raw)).toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/functions/simulate-turn/prompt.test.ts`
Expected: FAIL — `Cannot find module './prompt'`

- [ ] **Step 3: Implement prompt.ts**

`supabase/functions/simulate-turn/prompt.ts`:

```ts
interface SceneFields {
  location: string;
  moment: string;
  relationships: string;
  current_thread: string;
  green_light: string;
  yellow_light: string;
  red_light: string;
  off_limits_notes: string;
}

export function buildSystemPrompt(scene: SceneFields): string {
  return `你在扮演一个社交模拟场景里的对话对象，帮助用户练习开口和接话。

场景设定：
- 地点：${scene.location}
- 时刻：${scene.moment}
- 你和用户的关系：${scene.relationships}
- 当前对话线（此刻最自然会聊的话题）：${scene.current_thread}

开口许可参考：
- 绿灯（可以自然互动）：${scene.green_light}
- 黄灯（可以轻量尝试，没接就停）：${scene.yellow_light}
- 红灯（不要开口）：${scene.red_light}
- 明确不合适的方向：${scene.off_limits_notes}

对于用户的每一句输入，先判断它属于以下三种之一：
- "on_thread"：符合当前对话线，正常以角色身份自然继续。
- "borderline"：有点跳题、太私人或难接，用真实但较短的回应，可以给一句可选的教练小提示（coach_tip）。
- "off_limits"：明显越界或不合时宜，暂停这一轮，用温和语气说明原因，引导用户换一种说法，不用角色身份继续对话。

反馈语气要求：不说"错了""失败"，用具体、场景化的语言解释为什么这句话在当下关系/时刻里可能难接。

必须只返回如下 JSON，不要有其他文字：
{"reply": "角色说的话或引导语", "judgment": "on_thread" | "borderline" | "off_limits", "coach_tip": "一句可选提示或 null"}`;
}

export interface ParsedResponse {
  reply: string;
  judgment: "on_thread" | "borderline" | "off_limits";
  coach_tip: string | null;
}

const VALID_JUDGMENTS = new Set(["on_thread", "borderline", "off_limits"]);

export function parseModelResponse(raw: string): ParsedResponse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Model response was not valid JSON");
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.reply !== "string") throw new Error("Missing reply string");
  if (typeof obj.judgment !== "string" || !VALID_JUDGMENTS.has(obj.judgment)) {
    throw new Error(`Invalid judgment: ${obj.judgment}`);
  }
  const coachTip = typeof obj.coach_tip === "string" ? obj.coach_tip : null;
  return { reply: obj.reply, judgment: obj.judgment as ParsedResponse["judgment"], coach_tip: coachTip };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/functions/simulate-turn/prompt.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Implement the Deno HTTP handler (manually verified, not unit tested — Deno runtime)**

`supabase/functions/simulate-turn/index.ts`:

```ts
import { serve } from "https://deno.land/std@0.220.0/http/server.ts";
import { buildSystemPrompt, parseModelResponse } from "./prompt.ts";

interface RequestBody {
  scene: Parameters<typeof buildSystemPrompt>[0];
  history: { role: "user" | "assistant"; content: string }[];
  userMessage: string;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { scene, history, userMessage }: RequestBody = await req.json();
  const systemPrompt = buildSystemPrompt(scene);

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 400,
      system: systemPrompt,
      messages: [...history, { role: "user", content: userMessage }],
    }),
  });

  if (!anthropicRes.ok) {
    return new Response(JSON.stringify({ error: "AI request failed" }), { status: 502 });
  }

  const data = await anthropicRes.json();
  const rawText = data.content?.[0]?.text ?? "";

  try {
    const parsed = parseModelResponse(rawText);
    return new Response(JSON.stringify(parsed), {
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Malformed AI response" }), { status: 502 });
  }
});
```

- [ ] **Step 6: Manually verify the deployed function**

Run: `npx supabase functions deploy simulate-turn` then:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/simulate-turn" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"scene":{"location":"咖啡厅","moment":"刚坐下","relationships":"跨部门同事","current_thread":"饮品","green_light":"对方微笑","yellow_light":"中性","red_light":"戴耳机","off_limits_notes":"不问薪资"},"history":[],"userMessage":"你也点了燕麦拿铁？"}'
```

Expected: JSON response with `reply`, `judgment`, `coach_tip` fields.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/simulate-turn
git commit -m "feat: add simulate-turn Edge Function with scene-constrained prompt assembly"
```

---

## Task 10: SimulatorChatPlayer wired to the Edge Function

**Files:**
- Create: `src/components/simulator/useSimulatorTurn.ts`
- Test: `src/components/simulator/useSimulatorTurn.test.ts`
- Create: `src/components/simulator/SimulatorChatPlayer.tsx`
- Test: `src/components/simulator/SimulatorChatPlayer.test.tsx`
- Create: `src/pages/SimulatorSessionPage.tsx`

**Interfaces:**
- Consumes: `SceneCard` type; Supabase client for invoking the Edge Function (`supabase.functions.invoke`).
- Produces: `useSimulatorTurn(scene: SceneCard)` hook returning `{ messages, sendMessage(text: string): Promise<void>, sending: boolean }`.
- Produces: `SimulatorChatPlayer` component with props `{ scene: SceneCard; onEndSession: () => void }`, rendering messages, a text input, and the three turn-control buttons (继续一轮/自然收尾/结束练习).

- [ ] **Step 1: Write the failing test for useSimulatorTurn**

`src/components/simulator/useSimulatorTurn.test.ts`:

```ts
import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, test, expect } from "vitest";

const mockInvoke = vi.fn().mockResolvedValue({
  data: { reply: "还好，你呢？", judgment: "on_thread", coach_tip: null },
  error: null,
});
vi.mock("../../lib/supabaseClient", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));

import { useSimulatorTurn } from "./useSimulatorTurn";

const scene = { id: "sc1", location: "咖啡厅", moment: "m", relationships: "r", current_thread: "c", green_light: "g", yellow_light: "y", red_light: "rl", off_limits_notes: "o" } as any;

test("appends the user message immediately and the AI reply after resolving", async () => {
  const { result } = renderHook(() => useSimulatorTurn(scene));

  await act(async () => {
    await result.current.sendMessage("你也点了燕麦拿铁？");
  });

  expect(mockInvoke).toHaveBeenCalledWith("simulate-turn", {
    body: { scene, history: [], userMessage: "你也点了燕麦拿铁？" },
  });
  expect(result.current.messages).toEqual([
    { role: "user", content: "你也点了燕麦拿铁？" },
    { role: "assistant", content: "还好，你呢？", judgment: "on_thread", coach_tip: null },
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/simulator/useSimulatorTurn.test.ts`
Expected: FAIL — `Cannot find module './useSimulatorTurn'`

- [ ] **Step 3: Implement useSimulatorTurn**

`src/components/simulator/useSimulatorTurn.ts`:

```ts
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { SceneCard } from "../../data/types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  judgment?: "on_thread" | "borderline" | "off_limits";
  coach_tip?: string | null;
}

export function useSimulatorTurn(scene: SceneCard) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  async function sendMessage(text: string) {
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const userMessage: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("simulate-turn", {
        body: { scene, history, userMessage: text },
      });
      if (error) throw new Error(error.message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, judgment: data.judgment, coach_tip: data.coach_tip },
      ]);
    } finally {
      setSending(false);
    }
  }

  return { messages, sendMessage, sending };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/simulator/useSimulatorTurn.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing test for SimulatorChatPlayer**

`src/components/simulator/SimulatorChatPlayer.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, test, expect } from "vitest";

const mockSendMessage = vi.fn().mockResolvedValue(undefined);
vi.mock("./useSimulatorTurn", () => ({
  useSimulatorTurn: () => ({
    messages: [{ role: "assistant", content: "你也点了燕麦拿铁？", judgment: "on_thread" }],
    sendMessage: mockSendMessage,
    sending: false,
  }),
}));

import { SimulatorChatPlayer } from "./SimulatorChatPlayer";

const scene = { id: "sc1", current_thread: "饮品" } as any;

test("renders existing messages and shows the three turn-control buttons", () => {
  render(<SimulatorChatPlayer scene={scene} onEndSession={vi.fn()} />);
  expect(screen.getByText("你也点了燕麦拿铁？")).toBeInTheDocument();
  expect(screen.getByText("继续一轮")).toBeInTheDocument();
  expect(screen.getByText("自然收尾")).toBeInTheDocument();
  expect(screen.getByText("结束练习")).toBeInTheDocument();
});

test("sends the typed message when 继续一轮 is clicked", async () => {
  render(<SimulatorChatPlayer scene={scene} onEndSession={vi.fn()} />);
  await userEvent.type(screen.getByPlaceholderText("说点什么…"), "对啊，你常喝吗？");
  await userEvent.click(screen.getByText("继续一轮"));
  expect(mockSendMessage).toHaveBeenCalledWith("对啊，你常喝吗？");
});

test("calls onEndSession when 结束练习 is clicked", async () => {
  const onEnd = vi.fn();
  render(<SimulatorChatPlayer scene={scene} onEndSession={onEnd} />);
  await userEvent.click(screen.getByText("结束练习"));
  expect(onEnd).toHaveBeenCalled();
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/components/simulator/SimulatorChatPlayer.test.tsx`
Expected: FAIL — `Cannot find module './SimulatorChatPlayer'`

- [ ] **Step 7: Implement SimulatorChatPlayer**

`src/components/simulator/SimulatorChatPlayer.tsx`:

```tsx
import { useState } from "react";
import type { SceneCard } from "../../data/types";
import { useSimulatorTurn } from "./useSimulatorTurn";

export function SimulatorChatPlayer({
  scene,
  onEndSession,
}: {
  scene: SceneCard;
  onEndSession: () => void;
}) {
  const { messages, sendMessage, sending } = useSimulatorTurn(scene);
  const [draft, setDraft] = useState("");

  async function handleContinue() {
    if (!draft.trim()) return;
    const text = draft;
    setDraft("");
    await sendMessage(text);
  }

  return (
    <div className="stg-slab">
      <div className="stg-scene-card">当前对话线：{scene.current_thread}</div>
      <div className="stg-bubblewrap">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "stg-bubble stg-bubble--me" : "stg-bubble stg-bubble--them"}>
            {m.content}
          </div>
        ))}
      </div>
      <input
        className="stg-input"
        placeholder="说点什么…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={sending}
      />
      <div className="stg-turnrow">
        <button className="stg-btn stg-btn--ghost" onClick={handleContinue} disabled={sending}>继续一轮</button>
        <button className="stg-btn stg-btn--ghost" onClick={onEndSession}>自然收尾</button>
        <button className="stg-btn stg-btn--primary" onClick={onEndSession}>结束练习</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/components/simulator/SimulatorChatPlayer.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 9: Implement SimulatorSessionPage to load the scene by id and route to reflection on end**

`src/pages/SimulatorSessionPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { SimulatorChatPlayer } from "../components/simulator/SimulatorChatPlayer";
import type { SceneCard } from "../data/types";

export function SimulatorSessionPage() {
  const { sceneId } = useParams<{ sceneId: string }>();
  const navigate = useNavigate();
  const [scene, setScene] = useState<SceneCard | null>(null);

  useEffect(() => {
    if (!sceneId) return;
    supabase.from("scene_cards").select("*").eq("id", sceneId).single()
      .then(({ data }) => setScene(data as SceneCard));
  }, [sceneId]);

  if (!scene) return null;

  return (
    <SimulatorChatPlayer
      scene={scene}
      onEndSession={() => navigate(`/simulator/reflect/${scene.id}`)}
    />
  );
}
```

- [ ] **Step 10: Wire route and commit**

Add `/simulator/session/:sceneId` → `SimulatorSessionPage` to `App.tsx`.

```bash
git add src/components/simulator src/pages/SimulatorSessionPage.tsx src/App.tsx
git commit -m "feat: wire SimulatorChatPlayer to the simulate-turn Edge Function"
```

---

## Task 11: Reflection page (复盘)

**Files:**
- Create: `src/pages/ReflectionPage.tsx`
- Test: `src/pages/ReflectionPage.test.tsx`

**Interfaces:**
- Consumes: `insertPracticeRecord` from `src/data/queries.ts`; `useAuth`.
- Produces: `ReflectionPage` that writes a `practice_records` row with `scene_card_id`, `user_reflection_text`, and an optional milestone checkbox, then navigates to `/simulator`.

- [ ] **Step 1: Write the failing test**

`src/pages/ReflectionPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, test, expect } from "vitest";

const mockInsert = vi.fn().mockResolvedValue({ id: "rec-1" });
vi.mock("../data/queries", () => ({ insertPracticeRecord: (...args: unknown[]) => mockInsert(...args) }));
vi.mock("../auth/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));

import { ReflectionPage } from "./ReflectionPage";

test("submits reflection text and milestone flag tied to the scene card", async () => {
  render(
    <MemoryRouter initialEntries={["/simulator/reflect/sc1"]}>
      <Routes><Route path="/simulator/reflect/:sceneId" element={<ReflectionPage />} /></Routes>
    </MemoryRouter>
  );

  await userEvent.type(screen.getByPlaceholderText("写下你的感受…"), "比想象中轻松");
  await userEvent.click(screen.getByLabelText("这是一个里程碑"));
  await userEvent.click(screen.getByText("完成"));

  expect(mockInsert).toHaveBeenCalledWith({
    user_id: "u1",
    skill_card_id: null,
    scene_card_id: "sc1",
    user_reflection_text: "比想象中轻松",
    milestone_flag: true,
  });
});

test("shows the low-pressure completion copy, not a pass/fail message", () => {
  render(
    <MemoryRouter initialEntries={["/simulator/reflect/sc1"]}>
      <Routes><Route path="/simulator/reflect/:sceneId" element={<ReflectionPage />} /></Routes>
    </MemoryRouter>
  );
  expect(screen.getByText("你已经开口了。这就算完成。")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/ReflectionPage.test.tsx`
Expected: FAIL — `Cannot find module './ReflectionPage'`

- [ ] **Step 3: Implement ReflectionPage**

`src/pages/ReflectionPage.tsx`:

```tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { insertPracticeRecord } from "../data/queries";
import { useAuth } from "../auth/AuthProvider";

export function ReflectionPage() {
  const { sceneId } = useParams<{ sceneId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [milestone, setMilestone] = useState(false);

  async function handleSubmit() {
    await insertPracticeRecord({
      user_id: user!.id,
      skill_card_id: null,
      scene_card_id: sceneId!,
      user_reflection_text: text,
      milestone_flag: milestone,
    });
    navigate("/simulator");
  }

  return (
    <div className="stg-slab">
      <h1>你已经开口了。这就算完成。</h1>
      <p>不需要判断自己够不够有趣。只记录真实感觉。</p>
      <textarea
        className="stg-input"
        placeholder="写下你的感受…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <label>
        <input
          type="checkbox"
          aria-label="这是一个里程碑"
          checked={milestone}
          onChange={(e) => setMilestone(e.target.checked)}
        />
        这是一个里程碑
      </label>
      <button className="stg-btn stg-btn--primary" onClick={handleSubmit}>完成</button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/ReflectionPage.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Wire route and commit**

Add `/simulator/reflect/:sceneId` → `ReflectionPage` to `App.tsx`.

```bash
git add src/pages/ReflectionPage.tsx src/pages/ReflectionPage.test.tsx src/App.tsx
git commit -m "feat: add low-pressure reflection page after Simulator sessions"
```

---

## Task 12: Records page (我的记录)

**Files:**
- Create: `src/pages/RecordsPage.tsx`
- Test: `src/pages/RecordsPage.test.tsx`

**Interfaces:**
- Consumes: `getPracticeRecords` from `src/data/queries.ts`; `useAuth`.
- Produces: `RecordsPage` listing completed skill/scene practice with date and reflection text; milestone-flagged entries visually distinguished.

- [ ] **Step 1: Write the failing test**

`src/pages/RecordsPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { vi, test, expect } from "vitest";

vi.mock("../data/queries", () => ({
  getPracticeRecords: vi.fn(async () => [
    { id: "r1", scene_card_id: "sc1", skill_card_id: null, completed_at: "2026-09-10T10:00:00Z", user_reflection_text: "比想象中轻松", milestone_flag: true },
    { id: "r2", scene_card_id: null, skill_card_id: "s1", completed_at: "2026-09-08T09:00:00Z", user_reflection_text: null, milestone_flag: false },
  ]),
}));
vi.mock("../auth/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));

import { RecordsPage } from "./RecordsPage";

test("lists each record's reflection text when present", async () => {
  render(<RecordsPage />);
  expect(await screen.findByText("比想象中轻松")).toBeInTheDocument();
});

test("marks milestone-flagged records distinctly", async () => {
  render(<RecordsPage />);
  const milestoneRow = await screen.findByTestId("record-r1");
  expect(milestoneRow.className).toContain("stg-row--done");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/RecordsPage.test.tsx`
Expected: FAIL — `Cannot find module './RecordsPage'`

- [ ] **Step 3: Implement RecordsPage**

`src/pages/RecordsPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { getPracticeRecords } from "../data/queries";
import { useAuth } from "../auth/AuthProvider";
import type { PracticeRecord } from "../data/types";

export function RecordsPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<PracticeRecord[]>([]);

  useEffect(() => {
    if (!user) return;
    getPracticeRecords(user.id).then(setRecords);
  }, [user]);

  return (
    <div className="stg-slab">
      <h1>我的训练记录</h1>
      {records.map((r) => (
        <div
          key={r.id}
          data-testid={`record-${r.id}`}
          className={r.milestone_flag ? "stg-row stg-row--done" : "stg-row"}
        >
          <div>{new Date(r.completed_at).toLocaleDateString("zh-CN")}</div>
          {r.user_reflection_text && <div>{r.user_reflection_text}</div>}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/RecordsPage.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Wire route and commit**

Add `/records` → `RecordsPage` to `App.tsx`.

```bash
git add src/pages/RecordsPage.tsx src/pages/RecordsPage.test.tsx src/App.tsx
git commit -m "feat: add 我的记录 records page"
```

---

## Task 13: Today page (recommendation logic)

**Files:**
- Create: `src/pages/TodayPage.tsx`
- Test: `src/pages/TodayPage.test.tsx`

**Interfaces:**
- Consumes: `getSkillCards`, `getScenarioThemes`, `getSceneCards`, `getPracticeRecords`.
- Produces: `TodayPage` showing one recommended unpracticed Coach card and one recommended unpracticed Simulator scene, both skippable (no streak/forced copy), matching design.md §9.4's row/icon styling.

- [ ] **Step 1: Write the failing test**

`src/pages/TodayPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, test, expect } from "vitest";

vi.mock("../data/queries", () => ({
  getSkillCards: vi.fn(async () => [{ id: "s1", title: "先看开口时机" }, { id: "s2", title: "共同情境开场" }]),
  getScenarioThemes: vi.fn(async () => [{ id: "t1", title: "跨部门咖啡局" }]),
  getSceneCards: vi.fn(async () => [{ id: "sc1", location: "咖啡厅" }, { id: "sc2", location: "咖啡厅" }]),
  getPracticeRecords: vi.fn(async () => [{ id: "r1", skill_card_id: "s1", scene_card_id: null }]),
}));
vi.mock("../auth/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));

import { TodayPage } from "./TodayPage";

test("recommends the first uncompleted skill card", async () => {
  render(<MemoryRouter><TodayPage /></MemoryRouter>);
  expect(await screen.findByText("共同情境开场")).toBeInTheDocument();
});

test("shows a skip option, not a forced streak message", async () => {
  render(<MemoryRouter><TodayPage /></MemoryRouter>);
  expect(await screen.findByText("跳过今天")).toBeInTheDocument();
  expect(screen.queryByText(/连续|streak/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/TodayPage.test.tsx`
Expected: FAIL — `Cannot find module './TodayPage'`

- [ ] **Step 3: Implement TodayPage**

`src/pages/TodayPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSkillCards, getScenarioThemes, getSceneCards, getPracticeRecords } from "../data/queries";
import { useAuth } from "../auth/AuthProvider";
import type { SkillCard, SceneCard } from "../data/types";

export function TodayPage() {
  const { user } = useAuth();
  const [recommendedSkill, setRecommendedSkill] = useState<SkillCard | null>(null);
  const [recommendedScene, setRecommendedScene] = useState<SceneCard | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [skills, themes, records] = await Promise.all([
        getSkillCards("初阶"),
        getScenarioThemes(),
        getPracticeRecords(user.id),
      ]);
      const doneSkillIds = new Set(records.map((r) => r.skill_card_id));
      setRecommendedSkill(skills.find((s) => !doneSkillIds.has(s.id)) ?? null);

      if (themes[0]) {
        const scenes = await getSceneCards(themes[0].id);
        const doneSceneIds = new Set(records.map((r) => r.scene_card_id));
        setRecommendedScene(scenes.find((s) => !doneSceneIds.has(s.id)) ?? null);
      }
    })();
  }, [user]);

  return (
    <div className="stg-slab">
      <h1>早安。</h1>
      <p>今天想先练点什么？</p>
      {recommendedSkill && (
        <Link to={`/coach/初阶`} className="stg-row">
          <span className="stg-icon stg-icon--blue">👀</span>
          {recommendedSkill.title}
        </Link>
      )}
      {recommendedScene && (
        <Link to={`/simulator/session/${recommendedScene.id}`} className="stg-row">
          <span className="stg-icon stg-icon--orange">☕</span>
          {recommendedScene.location}
        </Link>
      )}
      <button className="stg-btn stg-btn--ghost">跳过今天</button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/TodayPage.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Wire route, set as default `/`, and commit**

Add `/today` → `TodayPage` to `App.tsx`, with `/` redirecting to `/today`.

```bash
git add src/pages/TodayPage.tsx src/pages/TodayPage.test.tsx src/App.tsx
git commit -m "feat: add Today page with skippable recommendations"
```

---

## Task 14: Wire full app routing, protect routes, and deploy to Vercel

**Files:**
- Modify: `src/App.tsx`
- Create: `vercel.json`

**Interfaces:**
- Produces: complete route tree with `RequireAuth` wrapping the `TabShell` layout; `vercel.json` SPA rewrite config.

- [ ] **Step 1: Finalize App.tsx**

`src/App.tsx`:

```tsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { TabShell } from "./components/layout/TabShell";
import { LoginPage } from "./pages/LoginPage";
import { TodayPage } from "./pages/TodayPage";
import { CoachHubPage } from "./pages/CoachHubPage";
import { CoachLevelPage } from "./pages/CoachLevelPage";
import { SimulatorHubPage } from "./pages/SimulatorHubPage";
import { SimulatorThemePage } from "./pages/SimulatorThemePage";
import { SimulatorSessionPage } from "./pages/SimulatorSessionPage";
import { ReflectionPage } from "./pages/ReflectionPage";
import { RecordsPage } from "./pages/RecordsPage";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth><TabShell /></RequireAuth>}>
            <Route path="/" element={<Navigate to="/today" replace />} />
            <Route path="/today" element={<TodayPage />} />
            <Route path="/coach" element={<CoachHubPage />} />
            <Route path="/coach/:level" element={<CoachLevelPage />} />
            <Route path="/simulator" element={<SimulatorHubPage />} />
            <Route path="/simulator/:themeId" element={<SimulatorThemePage />} />
            <Route path="/simulator/session/:sceneId" element={<SimulatorSessionPage />} />
            <Route path="/simulator/reflect/:sceneId" element={<ReflectionPage />} />
            <Route path="/records" element={<RecordsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Run the full test suite**

Run: `npx vitest run`
Expected: All tests across every task PASS.

- [ ] **Step 3: Add Vercel SPA rewrite config**

`vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 4: Deploy**

Run: `vercel --prod` (with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set as Vercel project env vars, and `ANTHROPIC_API_KEY` set as a Supabase Edge Function secret via `npx supabase secrets set ANTHROPIC_API_KEY=...`).
Expected: deployment succeeds; visiting the URL redirects unauthenticated users to `/login`.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx vercel.json
git commit -m "feat: wire full route tree behind auth and add Vercel deploy config"
```

---

## Self-Review Notes

- **Spec coverage:** §3 architecture → Task 1/14; §4 data model → Task 2; §5 Coach → Tasks 4–6; §6 Simulator boundary mechanism → Tasks 7, 9, 10; §7 auth/RLS → Tasks 2–3; §8 retention hooks → Task 13 (Today recommendations) + Task 6/8 (x/5 counters); §9 UI system → Task 1 tokens, reused throughout; §10 MVP scope → all tasks cumulatively. Illustration asset production (§9.2/9.3) is explicitly out of scope per Global Constraints.
- **Placeholder scan:** no TBD/TODO; every step has runnable code and a concrete expected test result.
- **Type consistency:** `SkillCard`, `ScenarioTheme`, `SceneCard`, `PracticeRecord`, `NewPracticeRecord` defined once in Task 3 and reused verbatim in Tasks 4–13; `ChatMessage`/`ParsedResponse` judgment union (`"on_thread" | "borderline" | "off_limits"`) is consistent between Task 9 (Edge Function) and Task 10 (frontend hook).
