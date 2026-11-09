# What Foundry's AI Content Policy requires from a listed system

Research for #603 (map #601: list the system in the Foundry package registry). Sources read on 2026-11-09.

## Answer in short

- The policy binds only packages in the official listing and marketplace; a self-published package is free of it ([AI policy §1.2](https://foundryvtt.com/article/ai-policy/)). Listing makes it binding on every release from the first one ([§6](https://foundryvtt.com/article/ai-policy/)).
- There is no disclosure to make and no tag to pick. A listed package "is assumed to include some amount of AI assistance unless explicitly designated otherwise" ([preamble](https://foundryvtt.com/article/ai-policy/)). "Contains Zero AI" has no replacement: a system written with agents simply carries none of the three AI categories.
- Code may be written with agents, on one condition: the author understands, can explain, modify and maintain all of it, attests to that at submission, and can prove it with commit history and answers ([§4.4](https://foundryvtt.com/article/ai-policy/), [§7](https://foundryvtt.com/article/ai-policy/)).
- All prepared text the user sees must be human-authored, **UI labels included**; AI may only proofread or format it ([§4.1](https://foundryvtt.com/article/ai-policy/)). AI translations are allowed once a speaker of the target language has reviewed them ([§4.1](https://foundryvtt.com/article/ai-policy/)). The listing's description must be human-written ([§4.5](https://foundryvtt.com/article/ai-policy/)).
- The gap in this repository is text, not code: the English strings, the welcome message summaries and the Spanish strings written since the fork, whose authorship git can't establish. The compendium is compliant as it is.
- The workflow change: humans write every user-facing English string (agents wire them), a fluent speaker reviews each translation, and no copyrighted material the maintainer has no rights to goes to an agent as context ([§1.1](https://foundryvtt.com/article/ai-policy/)).

## Sources

| Source | What it gives |
| --- | --- |
| [AI Content Policy](https://foundryvtt.com/article/ai-policy/) | The binding text. The live page still reads "Revised March 18, 2026"; no newer revision on 2026-11-09. Its §6.1 says the latest version at that URL is the binding one. |
| [FAQ](https://foundryvtt.com/article/faq/) | The "Zero AI" category and its `No AI` tag; listing goes through the Package Submission Form and a manual review. |
| [Package listing](https://foundryvtt.com/packages/) | The public categories: "AI Tools" and "Contains Zero AI" are listed, "Contains AI Content" is not. |
| ["Contains Zero AI" category](https://foundryvtt.com/packages/tag/zero-ai) | The category page (31 pages of packages). |
| [Assembling Kings' `genesys` listing](https://foundryvtt.com/packages/genesys) | Tagged "Contains Zero AI" (the case #603 asks about). |
| [Licensed Content guide](https://foundryvtt.com/article/licensing-guide/) | What the submission review checks besides AI: rights to everything shipped, third-party licences, art. |
| [Publisher Handbook](https://foundryvtt.com/article/publisher-handbook/) | Repeats the policy's summary for premium content; nothing new for a free system. |
| [Limited License for Package Development](https://foundryvtt.com/article/license/) | Says nothing about AI beyond a footer link: it is all a self-published package must follow ([§1.2](https://foundryvtt.com/article/ai-policy/)). |

Not read: the [Package Submission Form](https://foundryvtt.com/packages/submit) needs a login (it redirected to the listing), so the wording of the attestation it asks for is unknown. Foundry's server-side code was not read.

## What the policy requires

### Scope

- It covers generative AI (LLMs, diffusion models and the like), not procedural generation or other machine learning ([§1](https://foundryvtt.com/article/ai-policy/)).
- It covers the **user-facing content** of listed packages: "anything that is delivered to or executed on a user's computer as part of a package", namely written text (rules, item descriptions, **UI labels**), visual media, audio, **all code and configuration files**, and marketing materials ("any text or media content used to promote or describe the package"). "AI usage outside user-facing content is not restricted by this policy." ([§1.1](https://foundryvtt.com/article/ai-policy/))
- It applies at submission "and with each subsequent update"; a release that breaks it de-lists the package until fixed ([§6](https://foundryvtt.com/article/ai-policy/)). A new submission must comply at once; the 180-day grace period only covers packages already listed when the policy changes ([§2](https://foundryvtt.com/article/ai-policy/), [§6.1–6.2](https://foundryvtt.com/article/ai-policy/)).
- Self-publishing outside the listing stays a right of every licence holder, under the Limited License only ([§1.2](https://foundryvtt.com/article/ai-policy/)). That is the fork's status today (ADR 0002).

### Disclosure and tags

The March 2026 revision dropped disclosure: "Packages that do make use of AI tools within the scope of what is permitted by this policy are no longer required to disclose that usage. Packages are assumed to include some amount of AI assistance unless explicitly designated otherwise." ([preamble](https://foundryvtt.com/article/ai-policy/))

| Category | Who carries it | Fits this system? |
| --- | --- | --- |
| "Zero AI" (listed as "Contains Zero AI", tag `No AI`) | Self-assigned by authors who "have not used any AI tools at any stage of their package's creation", attesting that no AI touched the user-facing content or its development ([§6.6](https://foundryvtt.com/article/ai-policy/), [FAQ](https://foundryvtt.com/article/faq/)). A wrong claim loses the tag; a knowing one can de-list the package or the author. | No: the code is written with agents, and code is user-facing content ([§1.1](https://foundryvtt.com/article/ai-policy/)). Even a permitted use disqualifies ([§8](https://foundryvtt.com/article/ai-policy/): none of the permitted examples "qualify for the 'Zero AI' tag"). |
| "AI Tools" | Packages that call a model at runtime ([§6.7](https://foundryvtt.com/article/ai-policy/)). | No: the system calls no model (no model client or API in `src/`, `public/` or `yaml/`). |
| "Contains AI Content" | Packages **not** compliant, still visible during a grace period or under a premium agreement, with a written explanation of their AI use ([§6.5](https://foundryvtt.com/article/ai-policy/)). It is not in the public category list ([listing](https://foundryvtt.com/packages/)). | No: it is a non-compliance status, not a disclosure option, and a new submission has no grace period. |

So a compliant listing of this system carries **no AI category at all**. The only obligation left from the old regime is honesty: "Failure to disclose AI usage or misrepresenting how it was used may result in permanent de-listing" ([§6](https://foundryvtt.com/article/ai-policy/)), which in this revision reads as "don't lie when asked" and "don't claim Zero AI".

### Prepared text

- "All user-facing prepared written text must be human-authored. This includes rules material, lore, adventure content, journal text, item descriptions, and UI labels. AI tools may be used for editorial assistance with proofreading or formatting of human-authored text." ([§4.1](https://foundryvtt.com/article/ai-policy/))
- Prepared content is anything "intentionally pre-created", bundled or fetched from a source the author designates ([§3.1](https://foundryvtt.com/article/ai-policy/)). A summary of changes shown in chat, an error message or a setting's hint are all prepared.
- Package descriptions on foundryvtt.com "must be human-written and may not be generated by AI tools"; marketing must reflect the package and feature human-made work ([§4.5](https://foundryvtt.com/article/ai-policy/)).

### Translations

"Use of generative AI to translate human-authored text into other languages is permitted, but all translated text must be reviewed for accuracy by a person who speaks the target language before publication. This may be the package author or a contributor acting on their behalf." ([§4.1](https://foundryvtt.com/article/ai-policy/); example [§8.1 #6](https://foundryvtt.com/article/ai-policy/) says "a fluent speaker"). The source must itself be human-authored, so an AI translation of an AI-written English string stays non-compliant.

### Code

- Allowed: "AI-generated code, code completion, refactoring suggestions, debugging assistance, package documentation, and testing" ([§4.4](https://foundryvtt.com/article/ai-policy/)); example [§8.1 #5](https://foundryvtt.com/article/ai-policy/): code "substantially written with AI assistance".
- Required: "An author must be able to understand, explain, modify, and maintain every part of their submitted codebase", is "fully responsible for all code", and "must attest that they meet this standard at the time of submission". "Vibe coding" is prohibited ([§4.4](https://foundryvtt.com/article/ai-policy/)).
- Evidence on demand: "commit history, design notes, or direct explanation" ([§4.4](https://foundryvtt.com/article/ai-policy/)). The burden of proof is the author's: "maintaining a commit history that demonstrates iteration and authorship as well as the ability to answer technical questions about the design and implementation of that code" ([§7](https://foundryvtt.com/article/ai-policy/)).
- Agents may read Foundry's **client-side** source as context, only for package development ([§4.4](https://foundryvtt.com/article/ai-policy/)).
- SVG files count as code ([§4.2](https://foundryvtt.com/article/ai-policy/)).

### Materials given to a model

"Authors may only provide materials to an AI model, whether as training data or as runtime context, for which they hold the copyright or have a license that permits such use. This applies equally to locally-run models and external services." ([§1.1](https://foundryvtt.com/article/ai-policy/)) The sentence sits in the user-facing section, right after "AI usage outside user-facing content is not restricted", so its reach over development work is ambiguous (see open questions). Read conservatively, it covers whatever an agent is given while it writes the package: published rulebook text, other people's code under an incompatible licence, Foundry's server-side code.

### Enforcement

Reports go through the Contact Us form; staff may examine assets, commit history and documentation, and ask the author questions; rulings are final ([§7](https://foundryvtt.com/article/ai-policy/), [§7.2](https://foundryvtt.com/article/ai-policy/)). Outcomes: archival (reversible), deletion, submission ban ([§7.1](https://foundryvtt.com/article/ai-policy/)).

## What it forbids outright

From [§3–5](https://foundryvtt.com/article/ai-policy/) and the examples of [§8.2](https://foundryvtt.com/article/ai-policy/):

1. AI-generated prepared text: rules text, item or journal descriptions, UI labels, chat messages written ahead of time.
2. AI-generated images, video, UI assets, or AI images painted over by a human; AI post-processing beyond upscaling, denoising, colour correction or arrangement.
3. AI-generated music, sound effects or narration bundled with the package.
4. An AI-generated listing description or other marketing.
5. Code the author can't explain, modify or maintain.
6. AI translations published without review by a speaker of the language.
7. Runtime code generation executed without showing the code and getting the user's explicit confirmation.
8. Runtime access to content pre-generated by AI.
9. Feeding a model material the author has no rights to use that way, or a package that scrapes other installed content into a model.
10. Claiming "Zero AI" when any AI touched the user-facing content.

## Gap with this repository

Method: the fork point is `0578a19` ("Make release 0.2.19", 2026-05-24, Assembling Kings). Since then `main` has 355 commits, all authored by the maintainer, none with a co-author trailer (`git log 0578a19..HEAD`). The README's "AI assistance" section states that development after 0.2.19 is done with an AI coding assistant, reviewed and owned by the maintainer. **Git can't tell which lines an agent drafted and which the maintainer typed**: the commit author is the maintainer either way, and PRs are squash-merged. The figures below measure what changed since the fork, not who wrote it.

Strings were compared key by key between `0578a19` and `HEAD` (YAML flattened). Line shares come from `git blame -w 0578a19..HEAD`, which ignores whitespace-only changes.

| Item (what ships) | What the history shows | Status under the policy | Cost to comply |
| --- | --- | --- | --- |
| **Code**: `src/`, `public/templates/`, `build/`, `yaml/system.yml` (bundled into the release zip by `vite.config.ts`) | 78% of the text lines in shipped areas (source, templates, styles, language files, packs, font licences, plus README and CONTRIBUTING) were last changed after the fork (36,732 of 47,000); `src/actor`, `src/dice`, `src/combat`, `src/migrations` are above 90%. | Allowed if the maintainer understands and can maintain all of it, and attests to it. The evidence §7 asks for exists: one issue per change, PR bodies with Summary, Evidence and Merge Danger, ADRs, `GLOSSARY.md`, unit and e2e tests. Squash merges keep one commit per PR on `main`; the iteration lives on the PR pages. Inherited upstream code is covered by the same attestation. | Low in documents, real in substance: the attestation is personal. The maintainer has to be able to answer questions on any part of ~47k lines, upstream and agent-written alike. |
| **English UI labels**: `yaml/lang/en.yml` | 513 strings; since the fork 158 new and 3 reworded (347 unchanged, 5 moved). `docs/agents/code-style.md` tells agents to add the `en` key (and `fr`) in the same PR as the code. | Must be human-authored, AI limited to proofreading ([§4.1](https://foundryvtt.com/article/ai-policy/)). Any of the 161 strings an agent drafted is non-compliant. Can't be decided from git. | One-off: the maintainer reviews the 161 strings and rewrites in their own words any they didn't write (a few hours). Ongoing: see workflow below. |
| **Welcome message**: `public/templates/chat/alpha-notice.hbs` + `Genesys.AlphaNotice.*` | Its summary lines are rewritten at each release candidate and final version (`docs/agents/releasing.md`). The welcome paragraph is upstream text. | Prepared text shown in chat: human-authored. | Small and recurring: about eight lines per release written by hand, then translated. |
| **French**: `yaml/lang/fr.yml` | Since the fork 170 new and 122 reworded strings. Most rewordings come from `adf8609`, whose message says it ports "the translation fixes made by our GM" (a human, per that message). Upstream French came from contributor Zol (2023–2024). | A translation: compliant once a French speaker has reviewed it, and only if its English source is human-authored. | One-off review of ~170 strings by a fluent speaker (the maintainer or the table's GM); then per PR. Low if the maintainer reads French fluently. |
| **Spanish**: `yaml/lang/es.yml` | Since the fork 140 new strings (337 unchanged); upstream Spanish came from contributor Alejabar (upstream PR Mezryss/FVTT-Genesys#155, 2024). | Compliant only after review by a Spanish speaker ([§4.1](https://foundryvtt.com/article/ai-policy/)). Whether anyone reviewed the 140 strings isn't recorded. | The uncertain item: find a Spanish-speaking reviewer, or remove the post-fork Spanish strings so Foundry falls back on its fallback translations (`Localization._fallback` in fvtt-types; that it is English is to verify) and stop adding Spanish until someone reviews it. Removal is an hour; a reviewer depends on the community. |
| **Compendium**: `packs/crb-skills/` (37 Skill items) | Name, characteristic, category, "Core Rulebook, p.N", an **empty** description, a Foundry core icon (`icons/...webp`). Timestamps from January 2023 (upstream). Blame shows 100% post-fork only because #287 re-extracted the same records from the old `.db` file, field for field. | Compliant: no prose, no image of its own, human-made upstream data. | None. Any future compendium content (talents, qualities, a Realms of Terrinoth module) must be human-written. |
| **Images and media** | Only fonts ship in `public/assets/` (licensed, listed in the README). No SVG, image or audio file is tracked besides the four README screenshots (`screenshots/`, Mezryss, 2023). | Compliant. Screenshots are captures of the UI, not generated media. | None. New listing screenshots: capture them, don't generate or AI-retouch them. |
| **Manifest description**: `yaml/system.yml` `description` | "(ALPHA) Unofficial implementation of EDGE Studio's Genesys RPG System.", upstream text. | Prepared text: compliant. | None (unless the new id changes it; write it by hand). |
| **Listing description** on foundryvtt.com | Doesn't exist yet. | Must be human-written, no AI generation ([§4.5](https://foundryvtt.com/article/ai-policy/)). | About an hour, written by the maintainer without an agent draft. |
| **README, wiki, CHANGELOG, GitHub release notes** | README is 58% post-fork lines; not in the release zip (the build ships `public/`, the bundle, the language files, the packs and `system.json`). CHANGELOG is written by release-please from PR titles; the manifest links it. | Grey zone: §1.1 counts "any text ... used to promote or describe the package" as marketing, while §4.4 lists "package documentation" among allowed AI-assisted work. Not delivered to the user's computer, but linked from the listing. | Low if read as documentation. If read as marketing, the README's descriptive sections (intro, "What's new since the fork") and the wiki pages linked from the listing get human rewrites. |
| **Disclosure**: README "AI assistance" section | Present since `d0671a8` (2026-10-21). | Not required any more, not forbidden. Keeping it backs the "no misrepresentation" duty of §6. | None. Never self-assign "Zero AI". |
| **Runtime AI** | None. | Not in "AI Tools". | None. |

## What would have to change in how the maintainer works

1. **English strings come from the maintainer.** An agent may wire a key, but the text of every new or changed key in `en.yml` and every welcome-message line is written by the maintainer: in the issue (the agent copies it verbatim), or by editing `en.yml` in the PR before merge. An agent may proofread or reformat that text, nothing more. `docs/agents/code-style.md` ("Text and i18n") and `docs/agents/releasing.md` (welcome message) would say so, and the PR template or CI could check that a PR touching `yaml/lang/en.yml` says who wrote the strings. *Cost: a few minutes per user-facing PR, more friction than time.*
2. **Every translation gets a fluent reviewer before release.** French: the maintainer or the GM reviews each PR's French. Spanish: a named reviewer, or no new Spanish strings (`code-style.md` currently says "`es` when you can"). *Cost: low for French; Spanish depends on finding someone.*
3. **Prepared content stays human.** Compendium entries, journal text, item descriptions, chat text written ahead of time, screenshots, the listing description: written or made by a person. *Cost: none today; it rules out agent-written compendium content later, should the Realms of Terrinoth (#371) or Expanded Player's Guide (#483) plans ever ship any.*
4. **Understand before merging.** The maintainer reviews every agent PR until they could explain and modify it unaided; the Summary, Evidence, ADRs and issues already document design decisions, which is the evidence §7 names. Keep PR branches' commits visible (the default for merged PRs). *Cost: what the README's AI section already claims; the change is that it becomes an attestation to Foundry.*
5. **Only give an agent material the maintainer has rights to use that way** ([§1.1](https://foundryvtt.com/article/ai-policy/)): Foundry's client-side code and fvtt-types are fine ([§4.4](https://foundryvtt.com/article/ai-policy/); ADR 0006), Foundry's server-side code is not, and published rulebook text needs a licence that allows AI use, or stays out of agent context. *Cost: depends on how much rules checking relies on the rulebook text; possibly the largest workflow change.*
6. **Each release is checked before it is pushed to the listing**: since a non-compliant update de-lists the package ([§6](https://foundryvtt.com/article/ai-policy/)), the release checklist (#411 style) gets a line "user-facing strings and welcome message human-written, translations reviewed". *Cost: one checklist line per release.*

## Open questions

1. **Who wrote the 161 English strings, the welcome lines and the 140 Spanish strings added since the fork?** Only the maintainer can say; git can't. This decides whether the one-off rewrite is needed and how large it is.
2. **Does the maintainer, or someone at the table, read Spanish fluently?** If not: drop the post-fork Spanish, or recruit a reviewer (the upstream Spanish contributor, Alejabar, is a lead).
3. **Does the §1.1 rule on "materials" given to a model reach development work**, such as rulebook text used as an agent's context to check rules against code? Its placement suggests user-facing content only; its wording doesn't limit it. Worth asking Foundry before listing, or avoiding.
4. **Do README, wiki and CHANGELOG count as "marketing materials" (§1.1, §4.5) or "package documentation" (§4.4)?** The policy names both; a question to Foundry settles it.
5. **What does the submission form ask?** It is behind a login. §4.4 says authors "attest" to understanding their code at submission; the form may also ask about AI use (§6 still mentions "failure to disclose").
6. **Does the policy reach the code inherited from upstream?** The attestation is about "every part of their submitted codebase", so yes in principle; whether the maintainer can answer for the 22% of lines unchanged since 0.2.19 is the maintainer's call.
