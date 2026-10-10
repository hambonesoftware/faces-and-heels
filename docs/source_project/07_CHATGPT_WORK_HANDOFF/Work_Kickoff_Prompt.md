# Ready-to-Use ChatGPT Work Kickoff Prompt

Copy/paste this into a new Work session inside the Faces & Heels Project:

---

Continue development of **Faces & Heels** using the uploaded project package as the source of truth.

First, read:

- `00_START_HERE/PROJECT_CONTEXT.md`
- `00_START_HERE/SOURCE_PRIORITY.md`
- the original `Faces & Heels Rules.pdf`
- `02_RULES_ANALYSIS/Rules_Completeness_Audit.md`
- `02_RULES_ANALYSIS/Open_Rules_Decisions.md`
- `07_CHATGPT_WORK_HANDOFF/Decision_Log.md`
- `03_GAME_DESIGN/Touch_First_UX.md`
- `04_TECHNICAL_DESIGN/Architecture.md`
- `04_TECHNICAL_DESIGN/Animation_and_Sprite_System.md`

Do not invent missing rules. Start by helping me resolve the smallest set of high-priority rules decisions needed for a deterministic singles-match engine. Keep source rules, creator decisions, and your recommendations clearly separated.

Once those mechanics are approved, create the first headless TypeScript rules-engine prototype and automated tests. The eventual product target is an installable touch-first PWA, with the simplified match-screen visual direction and a practical 2D wrestler animation system. Keep Discord integration optional and architecturally separate so it can be added later without changing the rules engine.

When you modify code, return complete changed files with no omitted sections.

---
