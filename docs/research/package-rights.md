# What rights the package needs for what it ships

Research for [#610](https://github.com/kornifex/FVTT-Genesys/issues/610), part of the map [#601](https://github.com/kornifex/FVTT-Genesys/issues/601) (list the system in the Foundry package registry under a new id, [ADR 0008](../adr/0008-list-the-system-under-a-new-id.md)). Sources were read on 2026-11-09. The zip's contents were established by building `origin/main` (0.6.0-rc.1, `9ef647c`) as the release workflow does, not from memory. Claims marked **inference** are our reading; claims marked **unconfirmed** have no primary source.

## Answer in short

- Foundry's reviewers ask three questions: "Does the author have the rights to everything this module contains?", "Does it contain content from another company, and if so, does it meet that company's licensing requirements?", "Does it contain art assets which the author did not create?" ([Licensed Content](https://foundryvtt.com/article/licensing-guide/)).
- The zip holds **no rules text and no image, icon or sound file**. The compendium's 37 skills have empty descriptions; the languages hold UI strings, game terms and two page references. That passes the guide's "a line or two of text from a rule-book" test with room to spare.
- Third-party pieces: the Vue runtime (MIT), six font families (Google's Roboto family under Apache 2.0 or OFL, Bebas Neue under OFL), and the two **dice symbol fonts**. Everything but the symbol fonts is cleanly licensed.
- **Genesys Symbols** (the default dice font) is Mezryss's 2023 rebuild of TheMensch's MIT-licensed *Genesys Glyphs and Dice*: its glyphs are the same drawings, with ligatures added. The MIT licence covers TheMensch's work, but the drawings reproduce Fantasy Flight Games' dice symbols, and no FFG or EDGE licence covers fan software. Two listed systems ship the same symbols (Assembling Kings' `genesys`, which ships our exact files, and `starwarsffg`): precedent, not a licence. **A question for Foundry staff.**
- **Genesys Symbols – Magical Girl** carries MilkMyth's own art. The only record of a right to it is Mezryss's 2023 changelog line "With permission". Nothing written, no licence file, and nothing says the permission extends to a fork. **A licence we lack**: get MilkMyth's written permission for this fork, or drop the font before submitting.
- The zip breaks two notice conditions: it ships **no copy of the project's own MIT licence** (Mezryss's notice must be "included in all copies or substantial portions"), and the notices that do ship are stale (a `LICENSE` folder named after a font no longer shipped; Roboto Mono and Roboto Slab labelled OFL although their files say Apache 2.0). Cheap fixes, worth doing before a reviewer opens the zip.
- Trademark: "Genesys" stays a Fantasy Flight Games trademark; #602 covers it (no Foundry requirement, a disclaimer in the listing is ours to write). Nothing in the zip uses FFG's or EDGE's logos.

## Sources

| Source | What it gives |
| --- | --- |
| [Licensed Content](https://foundryvtt.com/article/licensing-guide/) | The review's three questions; "a line or two" of rulebook text; "You must also have the rights to share any artwork, icons, or music files which are distributed with your module or game system"; "the best answers about compliance will **always** come from the publishers themselves". |
| `.github/workflows/release.yml`, `vite.config.ts`, `build/packs.ts`, `build/yamlData.ts`, `yaml/system.yml` | What the zip is: `zip -r ../genesys.zip .` inside `dist/`, which Vite fills from `public/` (copied as is), the bundle of `src/`, `yaml/` turned into JSON, and `packs/` compiled to LevelDB. |
| `pnpm build` on `9ef647c`, `dist/` listing, `Genesys.js.map` | The exact file list below; the only third-party module in the bundles is `vue/dist/vue.runtime.esm-browser.prod.js`. |
| Font name tables (fontTools 4.68 on every shipped `.ttf`/`.woff2`) | Copyright, licence and vendor fields of each font. |
| `git log` of `public/assets/fonts/`, commits `98628be` (2023-02-04), `90e9bde` (2023-03-05), `2e50610` (#76) | When each font arrived and what was removed. |
| [themensch/FFG-Genesys-Glyphs-and-Dice](https://github.com/themensch/FFG-Genesys-Glyphs-and-Dice) | The source font, its MIT licence and its credits. |
| [Assembling Kings' listing](https://foundryvtt.com/packages/genesys), its [0.2.18 release zip](https://github.com/Mezryss/FVTT-Genesys/releases/tag/release-0.2.18) | Precedent: a listed system shipping the same symbol fonts. |
| [Star Wars FFG listing](https://foundryvtt.com/packages/starwarsffg), [StarWarsFoundryVTT/StarWarsFFG](https://github.com/StarWarsFoundryVTT/StarWarsFFG) | Precedent: a listed system shipping FFG symbol fonts and dice images. |
| [FFG Terms of Use](https://www.fantasyflightgames.com/more/terms-of-use/), [Genesys Foundry](https://www.edge-studio.net/genesys-foundry/) | The publisher's side: website terms only, and a commercial community programme on DriveThruRPG. No fan licence found. |

## What the zip contains

`pnpm build` writes `dist/`, and the release zips `dist/` whole. The README, `LICENSE`, `screenshots/` and everything else at the repo root stay out.

| Path in the zip | Origin | Licence | Notice in the zip |
| --- | --- | --- | --- |
| `Genesys.js`, `Genesys.js.map`, `assets/chanceWorker-*.js(.map)`, `style.css`, `templates/**/*.hbs`, `system.json` | Ours (Mezryss 2023, kornifex 2026), plus the Vue runtime inside `Genesys.js` | MIT | **None for ours**: `LICENSE` is not in `public/`. `system.json` only links it (`license:` URL). Vue keeps its banner (`(c) 2018-present Yuxi (Evan) You and Vue contributors`, `@license MIT`). |
| `lang/en.json`, `lang/fr.json`, `lang/es.json` | Ours, from `yaml/lang/` | MIT | As above. |
| `packs/crb-skills/` (LevelDB) | Ours, from `packs/crb-skills/*.yml`: 37 skills | MIT | As above. |
| `assets/fonts/Roboto/*.ttf` (12), `assets/fonts/Roboto_Condensed/*.ttf` (6) | Google, Roboto 2.137 (2017) | Apache 2.0 (name table) | `LICENSE.txt` in each folder. |
| `assets/fonts/RobotoMono-*VariableFont_wght.ttf` (2) | Google, Roboto Mono 3.000 | **Apache 2.0** (name table) | Apache text in `Roboto/`; the CSS comment and the README say OFL. |
| `assets/fonts/RobotoSlab-VariableFont_wght.ttf` | Google, Roboto Slab 2.001 | **Apache 2.0** (name table) | Same mismatch. |
| `assets/fonts/RobotoSerif-*VariableFont_*.ttf` (2) | Commercial Type for Google, Roboto Serif 1.007 | OFL 1.1 (name table) | `OFL.txt` (licence text, headed with Dharma Type's copyright); the Roboto Serif copyright is in the font's name table. |
| `assets/fonts/BebasNeue-Regular.ttf` | Dharma Type, Bebas Neue 2.000 | OFL 1.1 (name table) | `OFL.txt`. |
| `assets/fonts/GenesysSymbols-Regular-Ligatures.woff2` | Mezryss, built 2023-01-30 from TheMensch's font | MIT (TheMensch); the drawn symbols are FFG's | `FFG-Genesys-Glyphs-and-Dice/LICENSE` (TheMensch's MIT text); a CSS comment in `style.css`. The font itself carries no copyright field. |
| `assets/fonts/GenesysSymbols-MagicalGirl-Regular-Ligatures.woff2` | Mezryss, built 2023-03-06; result symbols by MilkMyth | **None written** | None. |
| `assets/fonts/FFG-Genesys-Glyphs-and-Dice/LICENSE` | TheMensch | MIT | Its folder held `GenesysGlyphsAndDice-3.0.ttf`, deleted in #76 as unused; the licence stayed because the derived font needs it. |

No image, sound or video file ships. The pack's 37 `img` fields and three defaults in the code (`icons/svg/mystery-man.svg`, `icons/svg/aura.svg`, `icons/skills/…webp`) are paths into Foundry's own core icon library, which every Foundry install serves. **Inference:** referencing them is not distributing them, so they need no right of ours. FontAwesome icons are Foundry's too; the sheets use Solid and three Regular icons (`star`, `circle`, `square-plus`), all in the Free set, which the README's rule already requires.

## The dice symbol fonts

### Genesys Symbols

- Its name table has no copyright, licence or designer field: family "Genesys Symbols", vendor `UKWN` (Glyphs' default for "unknown"), "Version 1.000;Glyphs 3.1.2", created 2023-01-30. Mezryss added it on 2023-02-04 (`98628be`), together with TheMensch's `GenesysGlyphsAndDice-3.0.ttf` and its MIT `LICENSE`.
- Mezryss's own comment above its `@font-face` (`src/fonts/scss/genesys.scss`, kept in the built `style.css`): "Genesys Glyphs & Dice is available under the MIT License (…themensch…/LICENSE). The customized GenesysSymbols-Regular-Ligatures font is created using symbols from this font."
- Rendering both fonts' outlines side by side confirms it: Advantage, Despair, Failure, Threat, Success, Triumph, the three ratings, and the solid and hollow die shapes are the same drawings in both. Genesys Symbols remaps them (`A`–`D`, `P`, `S` for the dice, `1`–`3` for the ratings) and adds six ligatures (`aa`, `ff`, `fh`, `hh`, `sa`, `ss`) for doubled results.
- TheMensch's font: "Copyright (c) 2019 TheMensch", MIT. Its README credits "forum users: lecudas and Territan for their prior art", Scott "Drainsmith" Zumwalt for later additions, and states "These fonts are not FFG-approved or Edge-approved". The font's own description field reads "Based on the Genesys glyph fony by lecudas from the FF Forums."
- So the chain of rights: Mezryss → TheMensch (MIT, satisfied by the shipped `LICENSE`) → lecudas's earlier font (**unconfirmed** licence, folded into TheMensch's) → the symbols themselves, which are Fantasy Flight Games' designs printed in the Genesys books and on its dice. TheMensch could license their own drawing, not FFG's design.
- FFG publishes no fan licence that we could find. Its [Terms of Use](https://www.fantasyflightgames.com/more/terms-of-use/) only cover the website, and reserve its "graphics, logos, … button icons" as trademarks or trade dress. [Genesys Foundry](https://www.edge-studio.net/genesys-foundry/) is EDGE's community programme for content sold on DriveThruRPG under an agreement signed at publication: it does not cover a free Foundry system.
- Precedent: Assembling Kings' listed `genesys` 0.2.18 zip ships `GenesysSymbols-Regular-Ligatures.woff2` (5,892 bytes) and the Magical Girl font (6,876 bytes), the same sizes as ours, plus TheMensch's TTF. The listed [Star Wars FFG](https://foundryvtt.com/packages/starwarsffg) system ships `genesysglyphsanddice.woff(2)`, `Genesys.ttf`, `EotESymbol-Regular-PLUS.otf` and dice-face images under `images/dice/genesys/`, with the line "contains no rules or proprietary content". **Inference:** Foundry staff have accepted fan-made renderings of FFG's dice symbols in listed systems. Whether a new review would still accept them is for staff to say.

### Genesys Symbols – Magical Girl

- Name table: family "Genesys Symbols - Magical Girl", vendor `UKWN`, "Glyphs 3.1.2", created 2023-03-06, no copyright or licence. Added in `90e9bde` ("Alpha 0.1.4: The Magical Update!").
- Its die shapes and ratings are the regular font's glyphs; its six result symbols and the ligatures are different drawings (stars, comets, orbs), MilkMyth's art.
- The only records of the right to ship them, both Mezryss's: the 0.1.4 changelog, "With permission, added [MilkMyth](http://milkmyth.com)'s updated Magical Girl custom Dice Symbols to the system!", and the README, "Symbols provided by and used with permission from MilkMyth!". No licence text, no scope (redistribution? forks?), no date. `milkmyth.com` now redirects to an Instagram account (`milkmyth.art`). No upstream issue or PR records the exchange.
- **Inference:** a permission given to Mezryss is not shown to extend to our fork, and the reviewer's question "Does it contain art assets which the author did not create?" has no documented answer for this file. It is the one piece we can't defend today. The font is optional (the client setting `useMagicalGirlSymbols`, off by default).

## Text from the rulebooks

- `packs/crb-skills/`: 37 Item documents. Each holds a skill name, a characteristic, a category, `career: false`, an `img` path into Foundry's icons, `description: ''` (all 37 empty) and a `source` such as `Core Rulebook, p.69`. Names and page numbers are facts, not prose.
- `yaml/lang/en.yml`: 513 strings, about 2,500 words, all UI text (labels, hints, notifications, migration messages, the welcome message). None longer than 350 characters, none paraphrases a rule. Two hints cite a page: the Uncoupling Skills alternate rule (p.205) and Super-Characteristics (p.251), by name only.
- `fr.yml`, `es.yml`: translations of the same keys. `fr.yml` uses the French edition's vocabulary (Formidable → « Exceptionnel », #484): single terms, not text.
- No talents, qualities, critical injury table, adversaries or setting content ship. The welcome template (`alpha-notice.hbs`) shows symbols through the font, and links to the repo.
- **Inference:** the guide's bar ("whole pages … unless you have a license agreement") is far away. Nothing here needs a licence. The future slices of the roadmap (#425: status effects, the critical table, qualities) would change that: each table or quality text copied from the book would need rewriting in our own words.

## Notices to fix before submitting

None of these needs anyone's permission; they make the zip answer the reviewer on its own.

1. **Ship the project's `LICENSE`.** MIT requires Mezryss's notice in every copy of the software; the zip has none. Copy it into the build (a `public/LICENSE`, or the release step). A third-party notice next to it would gather the rest.
2. **Vue's licence:** the banner names the licence but not its text. Shipping `node_modules/vue/LICENSE` in the same notice file settles it.
3. **The symbol fonts' notice:** rename or annotate `FFG-Genesys-Glyphs-and-Dice/LICENSE` so it reads as the licence of `GenesysSymbols-*.woff2` (derived from TheMensch's font), and credit lecudas and Drainsmith as TheMensch does.
4. **Roboto Mono and Roboto Slab** are labelled OFL in the README and their CSS comments, while the shipped files say "Licensed under the Apache License, Version 2.0". Fix the labels; the Apache text already ships.
5. **Roboto Serif:** `OFL.txt` carries only Dharma Type's copyright line. Add "Copyright 2020 The Roboto Serif Project Authors" so the OFL file covers both families without relying on the font metadata.
6. **README "Further Licenses"** still cites the deleted TTF and holds the only MilkMyth credit; it doesn't ship. Whatever the notice file says should match it.

## What needs a licence or a question

| Piece | Status | Action |
| --- | --- | --- |
| Our code, languages, compendium | Ours, MIT | Ship `LICENSE`. |
| Vue runtime | MIT | Ship its licence text. |
| Roboto family, Bebas Neue | Apache 2.0 / OFL, notices mostly in place | Fix labels and the OFL header. |
| Genesys Symbols font | MIT from TheMensch; depicts FFG's dice symbols with no FFG licence | **Ask Foundry staff** whether fan renderings of the Genesys dice symbols are acceptable, citing the two listed precedents. Alternative if refused: draw our own symbols. |
| Magical Girl font | Verbal permission to Mezryss, 2023, undocumented | **Licence we lack.** Ask MilkMyth for written permission covering this fork's redistribution, or drop the font and its setting before submitting. |
| Foundry core icons, FontAwesome Free | Foundry's, referenced not shipped | None. |
| "Genesys" in the title and description | FFG trademark | Disclaimer in the listing (#602). |

## Open

- Whether Foundry staff accept the FFG dice symbols in a new submission (ask in `#dev-support` or through the [contact form](https://foundryvtt.com/contact-us/), together with #602's fork question).
- How to reach MilkMyth today (the site is an Instagram redirect), and whether they agree.
- Whether EDGE Studio, which now publishes Genesys, has any position on fan software using the dice symbols; the guide says publishers give "the best answers". No contact route found.
- lecudas's original font licence, which TheMensch's MIT grant sits on (**unconfirmed**).
