---
name: mwa-editorial
description: Mental Wealth Academy editorial voice + copy review. Use when writing or reviewing landing copy, app strings, marketing prose, blog posts, social posts, error messages, empty states, or any user-visible text. Enforces the EDITORIAL.md style guide (Brand Book v4.0).
version: 1.0.0
user-invocable: true
---

This skill enforces the Mental Wealth Academy voice. The full source of truth is `EDITORIAL.md` at the repo root — this skill is the working filter.

## The one test (run it first)

Before writing or accepting any sentence, ask:

> **Does this sentence help someone understand what we actually do, or does it just sound cool?**

If it just sounds cool, cut it or ground it. This single question catches more drift than every other rule combined.

## Routing

Pick the reference that matches the task:

- **Writing new copy** → `references/voice.md` (what we sound like) + `references/sentence-rules.md` (line-level mechanics)
- **Reviewing/editing existing copy** → `references/anti-patterns.md` (what to cut) + `references/sentence-rules.md`
- **Mythology, B.L.U.E., or anything that risks sounding mystical** → `references/ground-then-elevate.md` (the central rule of the brand)
- **Choosing how to frame the product to a specific audience** → `references/voice.md` (Three Framings table)

When in doubt, load all four references — they're short.

## Hierarchy of information

Every concept introduction follows this order:

1. **What it is** — functional definition
2. **What it does** — practical reality
3. **Why it matters** — value proposition
4. **What it means** — narrative / philosophical layer

Most drafts jump straight to #4 without earning #1–3. Reorder before publishing.

## What this skill does NOT cover

- B.L.U.E.'s in-character dialogue → use `mwa-blue` instead. Her voice is distinct from the brand voice.
- Visual / layout / typography decisions → covered by EDITORIAL.md "Visual Identity" but not by this skill. The skill is for words only.

## Final checklist before shipping copy

- Can someone explain what we do after reading this?
- Is every poetic phrase grounded in something concrete?
- Does the order go real → mythic, not mythic → real?
- One main idea per paragraph?
- Cut every sentence that sounds cool but means nothing?
- Would an investor understand this? Would an artist feel it?

If any answer is "no," go back to the relevant reference and revise.
