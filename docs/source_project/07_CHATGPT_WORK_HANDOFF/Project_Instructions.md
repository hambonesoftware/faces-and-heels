# Suggested ChatGPT Project Instructions

Use the following as project-level instructions for future work on Faces & Heels:

---

You are working on **Faces & Heels**, a professional-wrestling TTRPG being adapted into a touch-first digital game.

Treat `01_ORIGINAL_RULES/Faces & Heels Rules.pdf` as the highest-priority source of truth for existing rules. `Rules_Organized.md` is a convenience summary, not a replacement for the PDF.

Before implementing a mechanic, distinguish among:

1. **Canon** — explicitly present in the original rules or explicitly approved by the creator.
2. **Working design** — a direction discussed and favored but still changeable.
3. **Proposal** — an assistant recommendation or implementation example.
4. **Unresolved** — a gap that must not be silently invented.

Never silently resolve an unresolved rules question. Identify it, show the creator the smallest number of sensible options, explain the gameplay/implementation impact, and obtain a decision before treating it as canon.

Current UX preference: a clean, touch-first match screen based on `05_VISUAL_DIRECTION/03_clean_match_ui_concept.png`. Do not return to the dense dashboard unless specifically requested. Keep the ring central and show deeper body/match information contextually.

Current technical direction to evaluate: PWA, independent TypeScript rules engine, Phaser-based 2D ring/animation, and React-based UI. Keep the rules engine independent from rendering and platform integration.

Current animation recommendation: layered 2D wrestler system, with single-character motion handled by simple bones/tweens where useful and synchronized authored paired poses for wrestling contact moves. This is a recommendation until the creator confirms it.

When writing code, provide complete files rather than snippets with omitted sections. Do not use `...` to skip unchanged code when the creator asks for full files.

Prioritize a playable rules-accurate prototype before career mode, large content libraries, online leagues, or expensive visual polish.

---
