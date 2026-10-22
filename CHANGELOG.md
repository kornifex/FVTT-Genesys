# Changelog

## [0.4.0-rc.1](https://github.com/kornifex/FVTT-Genesys/compare/v0.3.1...v0.4.0-rc.1) (2026-10-22)


### ⚠ BREAKING CHANGES

* **effects:** world migration 3 deletes the actor-side copies of item effects; it can't be undone without a world backup.
* **ui:** the system's sheets are ApplicationV2 windows. Their render hooks are `renderCharacterSheet`, `renderActorSheetV2`, `renderDocumentSheetV2`, `renderApplicationV2` (with an `HTMLElement`) instead of `renderActorSheet`/`renderItemSheet` with jQuery, so a module hooking the AppV1 names no longer sees them.

### Features

* **dice:** roll a skill the actor lacks from the Skills Compendium as an Unranked Skill Check, for every actor type ([#42](https://github.com/kornifex/FVTT-Genesys/issues/42)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **dice:** roll the skill check links of the check enricher from journal entries, chat messages and item sheets ([#44](https://github.com/kornifex/FVTT-Genesys/issues/44)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **ui:** hide the Talent Pyramid summary under Ignore Talent Pyramid ([#110](https://github.com/kornifex/FVTT-Genesys/issues/110)) ([61bf7b9](https://github.com/kornifex/FVTT-Genesys/commit/61bf7b95b4164280f28b789e666abb8f4399d078))


### Bug Fixes

* **actor:** cap the skill ranks bought during Character Creation at 2 ([#19](https://github.com/kornifex/FVTT-Genesys/issues/19)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **actor:** raise characteristics during Character Creation only, and check XP and the Talent Pyramid when ranking up a talent from the Talents tab ([#27](https://github.com/kornifex/FVTT-Genesys/issues/27)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **combat:** keep a Claim on its Initiative Slot when a reroll or an added slot changes the turn order ([#28](https://github.com/kornifex/FVTT-Genesys/issues/28)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **combat:** keep the turn on its Initiative Slot when an Extra Slot is added ([#54](https://github.com/kornifex/FVTT-Genesys/issues/54)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **combat:** keep the turn without turn events when initiative is written ([#59](https://github.com/kornifex/FVTT-Genesys/issues/59)) ([cee344d](https://github.com/kornifex/FVTT-Genesys/commit/cee344d5f5f3fb9024c626ab651a93bca29026cb))
* **combat:** list Initiative Slots in the Foundry v13 Combat Tracker, refuse claims of claimed slots and of combatants that already acted, and apply the roll mode to attack and initiative messages ([#18](https://github.com/kornifex/FVTT-Genesys/issues/18)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **combat:** roll a claimed Initiative Slot for its origin, not its claimant ([#34](https://github.com/kornifex/FVTT-Genesys/issues/34)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **combat:** roll each initiative into its own Initiative Slot after Extra Slots were added ([#45](https://github.com/kornifex/FVTT-Genesys/issues/45)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **dice:** apply Pool Modifications to every initiative roll, and update them when the dice prompt's characteristic changes ([#43](https://github.com/kornifex/FVTT-Genesys/issues/43)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **dice:** leave a [@pool](https://github.com/pool) enricher with a wrong-case glyph as plain text ([#115](https://github.com/kornifex/FVTT-Genesys/issues/115)) ([2846e4b](https://github.com/kornifex/FVTT-Genesys/commit/2846e4bbbcbe7a9fecbb80187d7e881221d96645))
* **effects:** keep a Pool Modification's skill outside the Skills Compendium, and list no empty defense Pool Modification ([#33](https://github.com/kornifex/FVTT-Genesys/issues/33)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **item:** count items in nested containers without freezing the sheet, and take back a Career's skills whatever their case ([#30](https://github.com/kornifex/FVTT-Genesys/issues/30)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **item:** post talent and item cards through one module ([#130](https://github.com/kornifex/FVTT-Genesys/issues/130)) ([0d7c8c1](https://github.com/kornifex/FVTT-Genesys/commit/0d7c8c1f5c8348f0ddba4d586ffecd62915a0c8c))
* **item:** show Formidable injuries and critical hits, and read severity from one module ([#126](https://github.com/kornifex/FVTT-Genesys/issues/126)) ([60ddfd6](https://github.com/kornifex/FVTT-Genesys/commit/60ddfd6a41dd4c4218b1bd11e158fdc5dd6444f9))
* **migration:** migrate the actors of unlinked tokens and of locked compendiums ([#41](https://github.com/kornifex/FVTT-Genesys/issues/41)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **ui:** derive the Palette's shades with color-mix ([#99](https://github.com/kornifex/FVTT-Genesys/issues/99)) ([498214a](https://github.com/kornifex/FVTT-Genesys/commit/498214a9b2fa0a8c40c7e8e9a453d3e505bb7c04))
* **vehicle:** delete a vehicle together with its crew without errors ([#129](https://github.com/kornifex/FVTT-Genesys/issues/129)) ([7185fef](https://github.com/kornifex/FVTT-Genesys/commit/7185fef4d87b04ad8d8e88d81ca47206fff8a5c0))
* **vehicle:** refresh the vehicle's Skills tab when its Roles or crew skills change ([#127](https://github.com/kornifex/FVTT-Genesys/issues/127)) ([ff90e6d](https://github.com/kornifex/FVTT-Genesys/commit/ff90e6db0bd6a1e2d39fd364de6cff7216b5d630))


### Code Refactoring

* **actor:** receive every inventory drop through one module ([#103](https://github.com/kornifex/FVTT-Genesys/issues/103)) ([3c299a8](https://github.com/kornifex/FVTT-Genesys/commit/3c299a87d6ed710e3df565008d68c631575fca78))
* **actor:** receive items dropped on an adversary and change its talent ranks through one module ([#131](https://github.com/kornifex/FVTT-Genesys/issues/131)) ([b3b93f5](https://github.com/kornifex/FVTT-Genesys/commit/b3b93f5d0e5af97fb7a61b5d435b8aaf47e18bdb))
* **actor:** turn the character's Skills tab into an adapter over the skill and characteristic rules ([#114](https://github.com/kornifex/FVTT-Genesys/issues/114)) ([9e317ce](https://github.com/kornifex/FVTT-Genesys/commit/9e317ce2d6f59cd0d93266a1e6445c4d6129a659))
* declare the v13 Foundry APIs the system uses ([#94](https://github.com/kornifex/FVTT-Genesys/issues/94)) ([e031010](https://github.com/kornifex/FVTT-Genesys/commit/e031010e6d620fac95891773258bdaa6bd409c61))
* **dice:** compute success chances from the TypeScript dice code ([#90](https://github.com/kornifex/FVTT-Genesys/issues/90)) ([43a7631](https://github.com/kornifex/FVTT-Genesys/commit/43a7631bc7c66ae8f37487bdbf39aea57b2acae7))
* **effects:** keep item effects on their items ([#102](https://github.com/kornifex/FVTT-Genesys/issues/102)) ([263a587](https://github.com/kornifex/FVTT-Genesys/commit/263a5879f97f858ce54ac6658fb1e297ea267013))
* **effects:** read Pool Modifications from one module ([#26](https://github.com/kornifex/FVTT-Genesys/issues/26)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* load the Skills Compendium through one function ([#100](https://github.com/kornifex/FVTT-Genesys/issues/100)) ([27cf152](https://github.com/kornifex/FVTT-Genesys/commit/27cf1525aed057036a8d45717292243ef4494648))
* rename files and exports to the written conventions ([#85](https://github.com/kornifex/FVTT-Genesys/issues/85)) ([73996e1](https://github.com/kornifex/FVTT-Genesys/commit/73996e1d232c1cab9ef3f61b55615543fd7df1ff))
* share the logic duplicated between data models, inventory tabs, archetypes and the dice prompt ([#21](https://github.com/kornifex/FVTT-Genesys/issues/21)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **ui:** move the Vue sheets to ApplicationV2 ([#95](https://github.com/kornifex/FVTT-Genesys/issues/95)) ([ada3c8e](https://github.com/kornifex/FVTT-Genesys/commit/ada3c8e721a9bb15e0e80d1f3405abc41a06a7d8))
* **ui:** share the Effects tab and the enriched source of the Vue sheets ([#101](https://github.com/kornifex/FVTT-Genesys/issues/101)) ([c8c30ef](https://github.com/kornifex/FVTT-Genesys/commit/c8c30ef8fdd3316af116e22d7c0149e539a6560b))
* use the glossary's terms for checks and Initiative Slot sides ([#20](https://github.com/kornifex/FVTT-Genesys/issues/20)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **vehicle:** arrange a vehicle's Crew in one module ([#109](https://github.com/kornifex/FVTT-Genesys/issues/109)) ([a483c6f](https://github.com/kornifex/FVTT-Genesys/commit/a483c6f4095a77515be3a18df6b93b36c5f87caf))


### Documentation

* keep Foundry v12 on a maintenance branch once main moves to v14 ([#108](https://github.com/kornifex/FVTT-Genesys/issues/108)) ([ea59304](https://github.com/kornifex/FVTT-Genesys/commit/ea593044213e4ae11f51bb3d2d917348b83678a0))
* keep the vendored Foundry types until v12 leaves support ([#93](https://github.com/kornifex/FVTT-Genesys/issues/93)) ([228d6d9](https://github.com/kornifex/FVTT-Genesys/commit/228d6d9743f1479e926ccbda4ff259c048c755be))
* list the container query polyfill in the further licenses ([#19](https://github.com/kornifex/FVTT-Genesys/issues/19)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* point the documentation links to the fork's wiki ([#97](https://github.com/kornifex/FVTT-Genesys/issues/97)) ([9858137](https://github.com/kornifex/FVTT-Genesys/commit/98581374c91fe04f3edec2499360bb88382a3647))
* write the code rules and the decisions behind them ([#75](https://github.com/kornifex/FVTT-Genesys/issues/75)) ([13093fa](https://github.com/kornifex/FVTT-Genesys/commit/13093fa7e2a7765f4d8e831697a14b89d250fae7))


### Build System

* build with Vite alone ([#78](https://github.com/kornifex/FVTT-Genesys/issues/78)) ([2e27706](https://github.com/kornifex/FVTT-Genesys/commit/2e27706fdd4946251149d025770b6afec48b20b3))
* install with pnpm on Node 24 ([#77](https://github.com/kornifex/FVTT-Genesys/issues/77)) ([93aeb47](https://github.com/kornifex/FVTT-Genesys/commit/93aeb4702868c2ad5e2970403369cfa8361a3dce))
* lint with ESLint 10, type-aware rules and knip ([#82](https://github.com/kornifex/FVTT-Genesys/issues/82)) ([a138f31](https://github.com/kornifex/FVTT-Genesys/commit/a138f312ab75a1a8f7e32204a7cc5ed93a1cf391))
* upgrade the toolchain and type-check in CI ([#79](https://github.com/kornifex/FVTT-Genesys/issues/79)) ([eec58b6](https://github.com/kornifex/FVTT-Genesys/commit/eec58b6938c504d83a493c25b12b218a1efa45ca))


### Continuous Integration

* move the GitHub Actions off Node 20 ([#105](https://github.com/kornifex/FVTT-Genesys/issues/105)) ([af02725](https://github.com/kornifex/FVTT-Genesys/commit/af02725947eba4b20450887f4f58ffc469c1df98))
* release 0.4.0 as release candidates ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* release with release-please ([#86](https://github.com/kornifex/FVTT-Genesys/issues/86)) ([b6d4800](https://github.com/kornifex/FVTT-Genesys/commit/b6d48007ebee4f6e615f21cb0b88b4debb5f197c))
* tag a hand-made draft release before publishing it ([#88](https://github.com/kornifex/FVTT-Genesys/issues/88)) ([6c63628](https://github.com/kornifex/FVTT-Genesys/commit/6c63628a300dae49c73e09f79ad94823f482ee7a))


### Miscellaneous Chores

* format at 140 columns ([#83](https://github.com/kornifex/FVTT-Genesys/issues/83)) ([8b9295b](https://github.com/kornifex/FVTT-Genesys/commit/8b9295bb8ff8d76b859be6e3582d271353b6923f))
* remove dead files, code, dependencies and upstream leftovers ([#76](https://github.com/kornifex/FVTT-Genesys/issues/76)) ([2e50610](https://github.com/kornifex/FVTT-Genesys/commit/2e5061021b109697c9b954f42f37d825ff69ce52))
* skip the 140-column reformat in git blame ([#84](https://github.com/kornifex/FVTT-Genesys/issues/84)) ([8c4cae6](https://github.com/kornifex/FVTT-Genesys/commit/8c4cae651d86540b98c7a34f2b795d21916f52ce))


### Tests

* keep a Foundry e2e harness in the repo ([#96](https://github.com/kornifex/FVTT-Genesys/issues/96)) ([cb348bc](https://github.com/kornifex/FVTT-Genesys/commit/cb348bcce264b761781b0de530da5a2a84471b4a))

## 0.3.1
### Changes
- [FIX](https://github.com/kornifex/FVTT-Genesys/commit/1824caef9f1a93d8d0b3acf8ca9f0cb9129db452): Count every term of a repeated die in roll results, so a hand-typed formula such as `2da + 1da` keeps the symbols of the second term
- [FEATURE](https://github.com/kornifex/FVTT-Genesys/commit/ae497293602c9aa602ee8d3fcb9453e622a4134f): Add a "Style" world setting, with a Realms of Terrinoth color variant chosen by the GM for every user
- [STYLING](https://github.com/kornifex/FVTT-Genesys/commit/dc0df416da4304262cb39b721fd9315b98eb0773): Use only FontAwesome Free icons: a few sheet icons change (injuries, inventory, weapons, careers)

<details>
<summary>Previous Releases</summary>

## Alpha 0.3.0
This is the first release from [kornifex/FVTT-Genesys](https://github.com/kornifex/FVTT-Genesys), which now maintains the system: see the README for why. To switch an existing install, paste `https://github.com/kornifex/FVTT-Genesys/releases/latest/download/manifest.json` in **Game Systems → Install System**. Your worlds are untouched.

### Changes
- [FIX](https://github.com/kornifex/FVTT-Genesys/commit/fe01eb276620a711888ba5a2ac6a74c5f81742a4): Fix initiative skill selection in the combat tracker: the chosen skill is shared between the GM and players and survives reloads
- [FEATURE](https://github.com/kornifex/FVTT-Genesys/commit/65a276460e66c596c7cab4ee1b57afa80aaf6deb): Roll skills an adversary has no ranks in (initiative, journal checks, weapons), listed as "Unranked" in the dice prompt
- [FEATURE](https://github.com/kornifex/FVTT-Genesys/commit/eaba0ca2f3f24c8620d11baeb7db74f358fa0c24): Add an "Ignore Talent Pyramid" house rule setting
- [FEATURE](https://github.com/kornifex/FVTT-Genesys/commit/0f89ed0ba9d91fa452cf7442dd945f36e8952d43): Add a "Talent Tier Versions" house rule setting, for talents with one item per tier
- [STYLING](https://github.com/kornifex/FVTT-Genesys/commit/f5ec9d6060ff25d77c2026095d1f28483bb6eb92): Expose the color palette as CSS custom properties, so worlds and modules can restyle the system
- [STYLING](https://github.com/kornifex/FVTT-Genesys/commit/7164d115542833e31dd829228cd78be1dd590d22): Give player notes the full width of the journal tab
- [LOCALIZATION](https://github.com/kornifex/FVTT-Genesys/commit/1810142ae5d6f81ef7a25733e21abb88a9e96e44): Localize adversary weapon details and XP journal characteristics
- [LOCALIZATION](https://github.com/kornifex/FVTT-Genesys/commit/adf860990bab9dc635c483172a5959d8900d2c18): Improve the French translation
- [MISC](https://github.com/kornifex/FVTT-Genesys/pull/7): Point the manifest, README and welcome links to the fork

## Alpha 0.2.19
### Changes
- [FIX](https://github.com/Mezryss/FVTT-Genesys/pull/258): Apply roll mode to geneys dice rolls (thanks @KitCat420)
- [STYLING](https://github.com/Mezryss/FVTT-Genesys/commit/920895a1d36372803c64ec54fa5b8a492020e0fb): Fix tooltips in FVTT13

## Alpha 0.2.18
### Changes
- [FEATURE](https://github.com/Mezryss/FVTT-Genesys/pull/231): Allow dice pools modifications to scale with talent rank (thanks @KitCat420)
- [FEATURE](https://github.com/Mezryss/FVTT-Genesys/pull/234): FoundryVTT v13 ActiveEffect config sheet workaround (thanks @KitCat420)
- [LOCALIZATION](https://github.com/Mezryss/FVTT-Genesys/pull/235): Fix missing character/vehicle sheet localizations (thanks @KitCat420)
- [STYLING](https://github.com/Mezryss/FVTT-Genesys/pull/236): Fix archetype characteristic label misalignment (thanks @KitCat420)
- [STYLING](https://github.com/Mezryss/FVTT-Genesys/pull/233): Fix sheet tab styling bleeding into other apps (thanks @KitCat420)
- [STYLING](https://github.com/Mezryss/FVTT-Genesys/pull/232): Fix simple difficulty showing as empty brackets in skill check enricher (thanks @KitCat420)

## Alpha 0.2.17
### Changes
- [FIX](https://github.com/Mezryss/FVTT-Genesys/pull/230): Fix duplication of active abilities without activation phrase in talents tab (thanks KitCat420)
- [FIX](https://github.com/Mezryss/FVTT-Genesys/pull/226): Handle dropping folder of items to actor sheets (thanks KitCat420)
- [STYLING](https://github.com/Mezryss/FVTT-Genesys/pull/227): Fix Story Point values being unreadable in FVTT v13 (thanks KitCat420)
- [STYLING](https://github.com/Mezryss/FVTT-Genesys/pull/229): Fix cut off sheet titles (thanks KitCat420)
- [FIX](https://github.com/Mezryss/FVTT-Genesys/pull/228): Fix the phrase at the top of actor sheets (thanks KitCat420)
- [LOCALIZATION](https://github.com/Mezryss/FVTT-Genesys/pull/225): Adds localization strings for equipment dropdown (thanks KitCat420)
- [FEATURE](https://github.com/Mezryss/FVTT-Genesys/pull/223): Adds a chat command to prompt the dice roller (thanks kornifex)

## Alpha 0.2.16
### Features / Enhancements
- MISC - Initial **basic** support for FVTT v13
- [PR #217](https://github.com/Mezryss/FVTT-Genesys/pull/217): ENHANCE - Sorts the talents and abilities on the character sheet
- [PR #221](https://github.com/Mezryss/FVTT-Genesys/pull/221): FIX - Fixes genesys font ligatures on Chromium

## Alpha 0.2.14

### Features / Enhancements
- [PR #204](https://github.com/Mezryss/FVTT-Genesys/pull/204): ENHANCE - Add an icon when rolling a skill with a super-characteristic
- [PR #209](https://github.com/Mezryss/FVTT-Genesys/pull/209): FEATURE - Construct actor-specific token trackable attributes
- [PR #210](https://github.com/Mezryss/FVTT-Genesys/pull/210): STYLING - Move the talents count to the top of the tab

### Bug Fixes / Misc
- [PR #201](https://github.com/Mezryss/FVTT-Genesys/pull/201): BUGFIX - Fix `@check` enricher to properly set the difficulty when clicked
- [PR #202](https://github.com/Mezryss/FVTT-Genesys/pull/202): BUGFIX - Fix adversaries not having a weapon skill when attacking
- [PR #203](https://github.com/Mezryss/FVTT-Genesys/pull/203): BUGFIX - Fix minion skills going over rank 5
- [PR #205](https://github.com/Mezryss/FVTT-Genesys/pull/205): BUGFIX - Let GM edit player SPs even when different than 0
- [PR #206](https://github.com/Mezryss/FVTT-Genesys/pull/206): BUGFIX - Let the user drop items into items if they have ownership
- [PR #207](https://github.com/Mezryss/FVTT-Genesys/pull/207): BUGFIX - Enforce talent pyramid purchase when dropping talents
- [PR #208](https://github.com/Mezryss/FVTT-Genesys/pull/208): BUGFIX - Allows to add a career so long no skills have been ranked up
- [PR #211](https://github.com/Mezryss/FVTT-Genesys/pull/211): MISC - Initial drop of support for v11
- [PR #212](https://github.com/Mezryss/FVTT-Genesys/pull/212): BUGFIX - Prevent an invalid talent pyramid due to a journal entry removal

## Alpha 0.2.13

### Features / Enhancements
- [PR #184](https://github.com/Mezryss/FVTT-Genesys/pull/184): BUGFIX - Fix adding setbacks to the dice pool when targeting a character
- [PR #185](https://github.com/Mezryss/FVTT-Genesys/pull/185): STYLING - HTML lists in the editor should now properly show their markers
- [PR #186](https://github.com/Mezryss/FVTT-Genesys/pull/186): FEATURE - Users can send to chat abilities and items from adversaries

## Alpha 0.2.12

### Features / Enhancements
- [PR #179](https://github.com/Mezryss/FVTT-Genesys/pull/179): FEATURE - More options to modify dice pools with active effects
- [PR #180](https://github.com/Mezryss/FVTT-Genesys/pull/180): BUGFIX - Properly calculate the skill ranks for minions on a vehicle's Skills tab
- [PR #181](https://github.com/Mezryss/FVTT-Genesys/pull/181): ENHANCEMENT - GMs can spend player's story points 

## Alpha 0.2.11

### Features / Enhancements
- [PR #177](https://github.com/Mezryss/FVTT-Genesys/pull/177): FEATURE - Full combatibility with FVTTv12
- [PR #155](https://github.com/Mezryss/FVTT-Genesys/pull/155): FEATURE - Spanish translations thanks to Alejabar

## Alpha 0.2.10

### Features / Enhancements
- [PR #151](https://github.com/Mezryss/FVTT-Genesys/pull/151): FEATURE - Confirm inventory deletion upon certain circumstances
- [PR #152](https://github.com/Mezryss/FVTT-Genesys/pull/152): FEATURE - Adds support for effects that cause pool modifications (Read the PR for more details)
- [PR #153](https://github.com/Mezryss/FVTT-Genesys/pull/153): FEATURE - Enhance text enrichers

## Alpha 0.2.9

### Features / Enhancements
- [PR #145](https://github.com/Mezryss/FVTT-Genesys/pull/145): FEATURE - Additional enhacenments and fixes to vehicle's sheets
    - Drop areas on the Inventory and Crew tabs now highlight regardless of the drop origin
    - Alternative view for the Skills tab
    - Propt for minion instantiation when dropping it to the sheet

### Bug Fixes / Misc
- [PR #149](https://github.com/Mezryss/FVTT-Genesys/pull/149): BUGFIX - Fix initiative message when rolling with symbols

## Alpha 0.2.8

### Bug Fixes / Misc
-	[PR #136](https://github.com/Mezryss/FVTT-Genesys/pull/136), [PR #144](https://github.com/Mezryss/FVTT-Genesys/pull/144): BUGFIX - Minion skills and Combat tabs reflect changes immediately
-	[PR #139](https://github.com/Mezryss/FVTT-Genesys/pull/139): LOCALIZATION - Corrections for the french translation (ZolOnTheNet)
-	[PR #143](https://github.com/Mezryss/FVTT-Genesys/pull/143): STYLING - Pad the motivation and notes editors

## Alpha 0.2.7

### Features / Enhancements
-	[PR #132](https://github.com/Mezryss/FVTT-Genesys/pull/132): ENHANCEMENT - Displays the source field data below an item's description
-	[PR #134](https://github.com/Mezryss/FVTT-Genesys/pull/134): FEATURE - Adds source field to adversaries and display it below their description

### Bug Fixes / Misc
-	[PR #129](https://github.com/Mezryss/FVTT-Genesys/pull/129): CHORE - Upgrade dependencies including Vue
-	[PR #131](https://github.com/Mezryss/FVTT-Genesys/pull/131): REFACTOR - Moves all the settings stored in the `CONFIG` to a nested path
-	[PR #130](https://github.com/Mezryss/FVTT-Genesys/pull/130): LOCALIZATION - Updates the french translation to the latest version (thanks to ZolOnTheNet)
-	[PR #133](https://github.com/Mezryss/FVTT-Genesys/pull/133): BUGFIX - Fixes drag & drop highlight not working on Chrome/app

## Alpha 0.2.6
This new version will attempt to perform a data migration for vehicles the first time a GM logins into the world. Make sure the migration is completed before doing anything on the world.

### Features
-	[PR #125](https://github.com/Mezryss/FVTT-Genesys/pull/125): Enhance the vehicle sheet and make transfering items more robust

### Bug Fixes/Misc
-	[PR #124](https://github.com/Mezryss/FVTT-Genesys/pull/124): Safely fail if the `CalculateChance` worker is not found
-	[PR #126](https://github.com/Mezryss/FVTT-Genesys/pull/126): Adds the french translation to the language menu (thanks to ZolOnTheNet)

## Alpha 0.2.5

### Features
-	[PR #117](https://github.com/Mezryss/FVTT-Genesys/pull/117): French translations thanks to ZolOnTheNet

### Bug Fixes/Misc
-	[PR #116](https://github.com/Mezryss/FVTT-Genesys/pull/116): Fixes a harmless bug on the chance to succeed Web Worker

## Alpha 0.2.4

### Bug Fixes/Misc
-	[PR #112](https://github.com/Mezryss/FVTT-Genesys/pull/112): Fix sending items to chat with no damage
-	[PR #115](https://github.com/Mezryss/FVTT-Genesys/pull/115): Fix rolls with extra symbols

## Alpha 0.2.3

### Features
-	[PR #111](https://github.com/Mezryss/FVTT-Genesys/pull/111): Access the dice prompt directly from the chat

### Bug Fixes/Misc
-	[PR #108](https://github.com/Mezryss/FVTT-Genesys/pull/108): Scope the character and vehicle style sheets

## Alpha 0.2.2

### Features
-	[PR #104](https://github.com/Mezryss/FVTT-Genesys/pull/104): Adds an alternate way to calculate the chance to succeed (FVTTv11 only)

### Bug Fixes/Misc
-	[PR #105](https://github.com/Mezryss/FVTT-Genesys/pull/105): Additional enhacenments and fixes to vehicle's sheets
	-	Adds a plus sign to values equal or greater than 0 when displaying the "Handling" characteristic
	-	Limits the actors that can be dropped into a vehicle to only those you own
	-	Display skill ranks on the "Skills" tab and the "Character Skill Selection" prompt.
	-	Open a character sheet when clicking on their name in the "Skills" tab.
	-	When selecting a skill from the "Character Skill Selection" prompt it now throws a warning when selecting an actor that you don't own (previously it was letting you roll for anyone).
	-	Adds the option to modify a vehicle's passenger quantity and capacity using after effects

## Alpha 0.2.0

### Features
-	[PR #99](https://github.com/Mezryss/FVTT-Genesys/pull/99): Adds support for vehicles

## Alpha 0.1.15

### Features
-	[PR #87](https://github.com/Mezryss/FVTT-Genesys/pull/87): Adds equipment's damage state to the inventory tab
-	[PR #88](https://github.com/Mezryss/FVTT-Genesys/pull/88): Adds support for super-characteristics
-	[PR #95](https://github.com/Mezryss/FVTT-Genesys/pull/95): Use super-characteristics during initiative
-	[PR #96](https://github.com/Mezryss/FVTT-Genesys/pull/96): Allows GMs to add extra initiative slots

### Bug Fixes/Misc

-	[#90](https://github.com/Mezryss/FVTT-Genesys/issues/90): Makes the tier bubble display properly
-	[PR #97](https://github.com/Mezryss/FVTT-Genesys/pull/97): Allows rolling dice pools without dice

## Alpha 0.1.14

### Bug Fixes/Misc

-	[PR #86](https://github.com/Mezryss/FVTT-Genesys/issues/86): Adds injuries and motivations to adversaries
-	[PR #85](https://github.com/Mezryss/FVTT-Genesys/issues/85): Implements sending abilities and talents to chat
-	[PR #84](https://github.com/Mezryss/FVTT-Genesys/issues/84): Bugfix: Removes renamed talents correctly

## Alpha 0.1.13

### Bug Fixes/Misc

-	[#81](https://github.com/Mezryss/FVTT-Genesys/issues/81): Can't save item sheets

## Alpha 0.1.12

### Features

-   [PR #77](https://github.com/Mezryss/FVTT-Genesys/pull/77): Show chance to succeed when forming dice pool.

### Bug Fixes/Misc

-	[#76](https://github.com/Mezryss/FVTT-Genesys/issues/76): Can't edit sheet images
-	[PR #79](https://github.com/Mezryss/FVTT-Genesys/pull/79): Fix talent ranks
-	[#57](https://github.com/Mezryss/FVTT-Genesys/issues/57): Fix combat tracker

## Alpha 0.1.11

### Features

-   [PR #68](https://github.com/Mezryss/FVTT-Genesys/pull/68): Allow PCs to do Unskilled rolls
-	[PR #71](https://github.com/Mezryss/FVTT-Genesys/pull/71): Can manually edit attached item qualities' rating
-	[#12](https://github.com/Mezryss/FVTT-Genesys/issues/12): Equipment should provide its passive ActiveEffects only while equipped

### Bug Fixes/Misc

-	[#47](https://github.com/Mezryss/FVTT-Genesys/issues/47): Fix bug preventing deletion of manually-added abilities.
-	[PR #69](https://github.com/Mezryss/FVTT-Genesys/pull/69): Make case errors more obvious for effect sheets
-	[PR #70](https://github.com/Mezryss/FVTT-Genesys/pull/70): Bugfix: Add up all containers bonus encumbrance
-	[#74](https://github.com/Mezryss/FVTT-Genesys/issues/74): Increasing the Brawn attribute after adding Toughened permanently adds 3 to the wound threshold instead of 1

## Alpha 0.1.10

### Features (thanks to Assembling Kings)

-   [#64](https://github.com/Mezryss/FVTT-Genesys/issues/64): Support unskilled rolls by clicking Characteristic name in NPC sheets.
-   [#29](https://github.com/Mezryss/FVTT-Genesys/issues/29): When editing an Item or Actor's name, make capitalization clear.
-   [PR #62](https://github.com/Mezryss/FVTT-Genesys/pull/62): Categorize Item & Actor types with OptGroups

### Bug Fixes

-   [PR #58](https://github.com/Mezryss/FVTT-Genesys/pull/58): Fix skill check enricher

## Alpha 0.1.9

### Features

- Send to Chat implemented for Inventory Items! Equivalent functionality for Abilities & Talents will come with the Talents tab updates.

### Bug Fixes

- Fix [#40](https://github.com/Mezryss/FVTT-Genesys/issues/40): Upgrading ranked talents was too restrictive.
- Fix [#42](https://github.com/Mezryss/FVTT-Genesys/issues/42): Journal entries for skill upgrades are showing the wrong rank.
- Fix [#44](https://github.com/Mezryss/FVTT-Genesys/issues/44): Ranked Talent effects don't stack per rank.

## Alpha 0.1.8

### Updates

-   Work on [#2](https://github.com/Mezryss/FVTT-Genesys/issues/2): Inventory 2.0. There is still more work to be done on this!

## Alpha 0.1.7

### Bug Fixes

-   Fix [#20](https://github.com/Mezryss/FVTT-Genesys/issues/20): The HTML mode of the text editor was improperly sized.

## Alpha 0.1.6

### Bug Fixes

-   Fix [#35](https://github.com/Mezryss/FVTT-Genesys/issues/35): Active talents with no active category were listed twice.

## Alpha 0.1.5

### Bug Fixes

-   Fix [#36](https://github.com/Mezryss/FVTT-Genesys/issues/36): Career item sheet was not showing editor view.

## Alpha 0.1.4: The Magical Update!

-   With permission, added [MilkMyth](http://milkmyth.com)'s updated Magical Girl custom Dice Symbols to the system! These can be enabled in settings, are client-specific (so each user can use them or not, at their own discretion), and are also available for use in Dice So Nice!

## Alpha 0.1.3

### Bug Fixes:

-   Fix [#32](https://github.com/Mezryss/FVTT-Genesys/issues/32): Deleting qualities & skills on an item embedded in an Actor failed with a proxy error.

## Alpha 0.1.2

### Bug Fixes:

-   Fix [#31](https://github.com/Mezryss/FVTT-Genesys/issues/31): Quantity adjustment for items in inventory doesn't work.

## Alpha 0.1.1

### Updates:

-   Disallowed adding ActiveEffects to Item Qualities until a better solution is implemented for referencing or embedding them in items.
-   [#25](https://github.com/Mezryss/FVTT-Genesys/issues/25) Allow adding item qualities to Armor.

### Bug Fixes:

-   Fix [#22](https://github.com/Mezryss/FVTT-Genesys/issues/22): In skills tab, context menu can appear below XP Container and other skill categories.
-   Fix [#27](https://github.com/Mezryss/FVTT-Genesys/issues/27): Disallow archetype removal if XP has changed since Archetype was applied.
</details>
