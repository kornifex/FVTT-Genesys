# Changelog

## [0.5.0-rc.4](https://github.com/kornifex/FVTT-Genesys/compare/v0.5.0-rc.3...v0.5.0-rc.4) (2026-11-01)


### Bug Fixes

* **dice:** pick the Difficulty by clicking one of five dice in the Dice Prompt ([#470](https://github.com/kornifex/FVTT-Genesys/issues/470)) ([27e7277](https://github.com/kornifex/FVTT-Genesys/commit/27e7277d1ac254baef805c0a3e5812d44e5ac45d))
* **effects:** count a talent's token changes once per rank at every token preparation ([#467](https://github.com/kornifex/FVTT-Genesys/issues/467)) ([d391e0d](https://github.com/kornifex/FVTT-Genesys/commit/d391e0df875d8b99709782b6cdba6eb842844b30))
* **i18n:** smooth the French and Spanish wording of the Archetype, Career and Journal messages ([#465](https://github.com/kornifex/FVTT-Genesys/issues/465)) ([194e47a](https://github.com/kornifex/FVTT-Genesys/commit/194e47aec2742f2c56330c2a4f618818246c27a7))


### Documentation

* add a CONTRIBUTING.md ([#459](https://github.com/kornifex/FVTT-Genesys/issues/459)) ([3bc5a94](https://github.com/kornifex/FVTT-Genesys/commit/3bc5a949f0c32169664059cc6c6cd455d9a62ce9))
* explain the fork's changes and its supported Foundry versions in the README ([#457](https://github.com/kornifex/FVTT-Genesys/issues/457)) ([d2924cc](https://github.com/kornifex/FVTT-Genesys/commit/d2924cc67eff38ed694c56dc7cf1603a770f0225))
* record in ADR 0003 that Foundry v12 refuses a release for v13 ([#462](https://github.com/kornifex/FVTT-Genesys/issues/462)) ([7c91a2e](https://github.com/kornifex/FVTT-Genesys/commit/7c91a2ee63e92853367f42c3a4a860640c04afea))


### Continuous Integration

* set the next release to 0.5.0 ([#454](https://github.com/kornifex/FVTT-Genesys/issues/454)) ([77c06e5](https://github.com/kornifex/FVTT-Genesys/commit/77c06e506cc8e534e82fe138d1c47adcaf9d5bd2))
* set the next release to 0.5.0-rc.4 ([#471](https://github.com/kornifex/FVTT-Genesys/issues/471)) ([899c6fb](https://github.com/kornifex/FVTT-Genesys/commit/899c6fbd2aa765361744084baa9bbbd7481dc0b7))


### Tests

* automate the open items of the 0.5.0 test checklist ([#468](https://github.com/kornifex/FVTT-Genesys/issues/468)) ([fe39e0a](https://github.com/kornifex/FVTT-Genesys/commit/fe39e0a9d9291563494489d3c787dfdc1001722e))

## [0.5.0-rc.3](https://github.com/kornifex/FVTT-Genesys/compare/v0.5.0-rc.2...v0.5.0-rc.3) (2026-10-31)


### Features

* **dice:** let the roller set the check's Difficulty in the Dice Prompt ([#452](https://github.com/kornifex/FVTT-Genesys/issues/452)) ([f3a629d](https://github.com/kornifex/FVTT-Genesys/commit/f3a629d733a4b85c8b603113507847af8683ebfc))


### Bug Fixes

* **dice:** turn each Pool Modification on alone, though another effect shares its name ([#449](https://github.com/kornifex/FVTT-Genesys/issues/449)) ([4897a90](https://github.com/kornifex/FVTT-Genesys/commit/4897a9090af5d2654001d1c74a2bb20e06fd55c9))


### Documentation

* define the Difficulty of a check in the glossary ([#451](https://github.com/kornifex/FVTT-Genesys/issues/451)) ([c241733](https://github.com/kornifex/FVTT-Genesys/commit/c241733484ec0cb8a0fd7931247a2d31642dbd0b))


### Continuous Integration

* set the next release to 0.5.0 ([#446](https://github.com/kornifex/FVTT-Genesys/issues/446)) ([22819f2](https://github.com/kornifex/FVTT-Genesys/commit/22819f21df82e35c54f85eaa5890475c002bdf1b))
* set the next release to 0.5.0-rc.3 ([#453](https://github.com/kornifex/FVTT-Genesys/issues/453)) ([befa990](https://github.com/kornifex/FVTT-Genesys/commit/befa990f74e1c65b06c6b028529603f735e78c9d))

## [0.5.0-rc.2](https://github.com/kornifex/FVTT-Genesys/compare/v0.5.0-rc.1...v0.5.0-rc.2) (2026-10-31)


### Features

* **actor:** ask before undoing any entry of the Experience Journal ([#438](https://github.com/kornifex/FVTT-Genesys/issues/438)) ([42057a1](https://github.com/kornifex/FVTT-Genesys/commit/42057a1ccb981251837956afcba2c82bcfb596fd))
* **ui:** open an inventory row's menu under the pointer on a right-click ([#440](https://github.com/kornifex/FVTT-Genesys/issues/440)) ([3bac011](https://github.com/kornifex/FVTT-Genesys/commit/3bac0119dbce9c4044daa86810e41d2df17c577d))


### Bug Fixes

* **actor:** offer to remove the Career only while it can be replaced ([#442](https://github.com/kornifex/FVTT-Genesys/issues/442)) ([c45cf50](https://github.com/kornifex/FVTT-Genesys/commit/c45cf50577ea6b82bccf12b2bb968ddc67400950))
* **actor:** tell the user why a dropped Archetype or Career is refused ([#435](https://github.com/kornifex/FVTT-Genesys/issues/435)) ([6bb7763](https://github.com/kornifex/FVTT-Genesys/commit/6bb7763a464468b7bec9532333747397648b17b0))
* **combat:** label the Combat Tracker's combatant controls with Foundry v14's keys ([#422](https://github.com/kornifex/FVTT-Genesys/issues/422)) ([86bd390](https://github.com/kornifex/FVTT-Genesys/commit/86bd390104e903271fa42b63a29ffd60f8869e68))
* **i18n:** say in the damage-on-failure hint that a failed attack keeps its qualities ([#434](https://github.com/kornifex/FVTT-Genesys/issues/434)) ([51e33e1](https://github.com/kornifex/FVTT-Genesys/commit/51e33e115b5aa0fb1d05fafaede4a8e1cfa85a6b))
* **item:** fit each Weapon Profile's block to its rows ([#439](https://github.com/kornifex/FVTT-Genesys/issues/439)) ([0eba5ed](https://github.com/kornifex/FVTT-Genesys/commit/0eba5edb0ca925632ff95236e61842828e52c3c6))
* **migration:** link the talent purchases recorded without a talent id to their talent ([#443](https://github.com/kornifex/FVTT-Genesys/issues/443)) ([dab13ef](https://github.com/kornifex/FVTT-Genesys/commit/dab13ef97d2c519a0c832934111ca12d92e1df87))
* **ui:** give a chat card's rich-text headings the look of a sheet's ([#437](https://github.com/kornifex/FVTT-Genesys/issues/437)) ([530d677](https://github.com/kornifex/FVTT-Genesys/commit/530d677a67a61fc610e3c2d4d32c400cdfde5fe1))


### Documentation

* define Status Effect and Quality in the glossary ([#426](https://github.com/kornifex/FVTT-Genesys/issues/426)) ([67a9c26](https://github.com/kornifex/FVTT-Genesys/commit/67a9c26b41843182e206474d722218641cb05aed))
* record why the sheets don't follow the dark interface theme yet ([#427](https://github.com/kornifex/FVTT-Genesys/issues/427)) ([8ddf0a7](https://github.com/kornifex/FVTT-Genesys/commit/8ddf0a78832e28684340a4dd689f34e0bbdd8168))


### Continuous Integration

* set the next release to 0.5.0 ([#408](https://github.com/kornifex/FVTT-Genesys/issues/408)) ([1c3efae](https://github.com/kornifex/FVTT-Genesys/commit/1c3efae247f3a905ad09530b9b59ce8c050d835c))
* set the next release to 0.5.0-rc.2 ([#444](https://github.com/kornifex/FVTT-Genesys/issues/444)) ([5cf5589](https://github.com/kornifex/FVTT-Genesys/commit/5cf55898309fd21eddbfe810905f248dfead45f3))


### Tests

* **ui:** prove that a sheet and the Dice Roller work detached into their own window on Foundry v14 ([#424](https://github.com/kornifex/FVTT-Genesys/issues/424)) ([073e12f](https://github.com/kornifex/FVTT-Genesys/commit/073e12f0cb041114bfa708133fd35a769d9714d2))

## [0.5.0-rc.1](https://github.com/kornifex/FVTT-Genesys/compare/v0.4.0-rc.1...v0.5.0-rc.1) (2026-10-30)


### ⚠ BREAKING CHANGES

* read a document's system as its subtype's DataModel, without the systemData getters ([#381](https://github.com/kornifex/FVTT-Genesys/issues/381))
* the system requires Foundry v13 or later. A v12 world stays on 0.4.x.

### Features

* **actor:** open an inventory row's menu on a right-click, and place an item dropped on a row before or after it ([#389](https://github.com/kornifex/FVTT-Genesys/issues/389)) ([2b8faa8](https://github.com/kornifex/FVTT-Genesys/commit/2b8faa8200aa98481b91926590ce22a074d4e339))
* **dice:** give characters and Adversaries a Silhouette, and change a targeted attack's difficulty by the silhouette difference ([#390](https://github.com/kornifex/FVTT-Genesys/issues/390)) ([9e90afd](https://github.com/kornifex/FVTT-Genesys/commit/9e90afd13236d26d9a4e2f8b336842993e8ac6fe))
* **dice:** open the Dice Roller from a button of the chat controls ([#383](https://github.com/kornifex/FVTT-Genesys/issues/383)) ([a2d74cd](https://github.com/kornifex/FVTT-Genesys/commit/a2d74cd8c35ea32ccdd5bcdafa5fdd5ea1c66db6))
* **item:** give a weapon extra Weapon Profiles, each attacked with from its own row ([#391](https://github.com/kornifex/FVTT-Genesys/issues/391)) ([15c7d08](https://github.com/kornifex/FVTT-Genesys/commit/15c7d0881248530edd86587afeb18dd168840d34))
* **ui:** open a Combat tab row's description from a chevron, and write its description styles once ([#399](https://github.com/kornifex/FVTT-Genesys/issues/399)) ([1ba9704](https://github.com/kornifex/FVTT-Genesys/commit/1ba97048d4fa8047bcde7226bc2df9c2b6e4ce0c))


### Bug Fixes

* **actor:** ask for a reload when Ignore Talent Pyramid changes ([#364](https://github.com/kornifex/FVTT-Genesys/issues/364)) ([9b7accc](https://github.com/kornifex/FVTT-Genesys/commit/9b7accc8ddab025625108e47dbca7bc49d347b96))
* **combat:** reroll the slot from the tracker's menu on Foundry v14 ([#296](https://github.com/kornifex/FVTT-Genesys/issues/296)) ([9221f83](https://github.com/kornifex/FVTT-Genesys/commit/9221f83ee386a2dd763166025a26977e4a119ac8))
* **dice:** extend foundry.dice.terms.Die, which v14 keeps, instead of the removed Die global ([#293](https://github.com/kornifex/FVTT-Genesys/issues/293)) ([bd26b26](https://github.com/kornifex/FVTT-Genesys/commit/bd26b265b896d90ccac494ff352cfc74a63c7ef6))
* **effects:** scale a talent's changes by its rank on Foundry v14, which calls the static applyChange ([#298](https://github.com/kornifex/FVTT-Genesys/issues/298)) ([41d6114](https://github.com/kornifex/FVTT-Genesys/commit/41d6114ef108040ee0363fdaba7ab56dc9c6842f))
* **effects:** show and save the effect sheet's changes on Foundry v14 ([#297](https://github.com/kornifex/FVTT-Genesys/issues/297)) ([3af8b51](https://github.com/kornifex/FVTT-Genesys/commit/3af8b5183e24622ea804f6ff7d390fd893dbf4dc))
* **effects:** stop applying an effect whose duration in rounds or turns has run out ([#398](https://github.com/kornifex/FVTT-Genesys/issues/398)) ([00cbfc2](https://github.com/kornifex/FVTT-Genesys/commit/00cbfc2ea75d003cb07ffcaaf0551592a1e59227))
* **i18n:** localize the strings shown raw, and build every dynamic key from a typed table ([#348](https://github.com/kornifex/FVTT-Genesys/issues/348)) ([a201678](https://github.com/kornifex/FVTT-Genesys/commit/a2016785b360fafdbbeb58f6043c3a91cfd3a6f3))
* **migration:** enable the equipment effects left disabled from 0.3.1, so the Equipment State decides ([#309](https://github.com/kornifex/FVTT-Genesys/issues/309)) ([e4b3694](https://github.com/kornifex/FVTT-Genesys/commit/e4b3694694d40d6ea0f50b06824a5a942fc18b8a))
* send a player's socket operations to one Acting GM, so a Story Point spend is written once ([#335](https://github.com/kornifex/FVTT-Genesys/issues/335)) ([ba40b0f](https://github.com/kornifex/FVTT-Genesys/commit/ba40b0f667c40911fbe3c9898aa80a93e500aa0f))
* **ui:** center an adversary's and a vehicle's editable characteristic values on Foundry v13 and v14 ([#307](https://github.com/kornifex/FVTT-Genesys/issues/307)) ([9f061b2](https://github.com/kornifex/FVTT-Genesys/commit/9f061b28f2b3bd00e60769ea2db59ba84b44a79a))
* **ui:** collapse a minimized sheet to its header, and keep its minimum size only while open ([#316](https://github.com/kornifex/FVTT-Genesys/issues/316)) ([f6c33e1](https://github.com/kornifex/FVTT-Genesys/commit/f6c33e1dbade9d5b89c55a0b6f09474d53f3396b))
* **ui:** give a sheet's rich-text headings the look of an AppV1 window ([#384](https://github.com/kornifex/FVTT-Genesys/issues/384)) ([aa2aa0f](https://github.com/kornifex/FVTT-Genesys/commit/aa2aa0fae8c1986ea8ae63f7c92080c395913aa8))
* **ui:** show an expanded row's whole description, however long, instead of cutting it at a fixed height ([#387](https://github.com/kornifex/FVTT-Genesys/issues/387)) ([7613a8f](https://github.com/kornifex/FVTT-Genesys/commit/7613a8f0e8079a0959f910ab70749a4833ef6e9b))
* **ui:** shrink an adversary's empty description and grow the HTML source editor with its text ([#397](https://github.com/kornifex/FVTT-Genesys/issues/397)) ([a197cce](https://github.com/kornifex/FVTT-Genesys/commit/a197cce1e3422ed2184a07cbc5fd959c2e4fb2f4))


### Code Refactoring

* **actor:** route archetype, career and talent drops on a character through one plan ([#338](https://github.com/kornifex/FVTT-Genesys/issues/338)) ([e31a364](https://github.com/kornifex/FVTT-Genesys/commit/e31a364e10d3e59fefff7767e950b5e7c89f4922))
* **combat:** compute the turn order in a Turn Order module, and number a combatant's turn by its first slot ([#403](https://github.com/kornifex/FVTT-Genesys/issues/403)) ([0a1c84a](https://github.com/kornifex/FVTT-Genesys/commit/0a1c84a60b57cd55c0e6de049b667fb7542b8462))
* **combat:** name the combat code after the glossary, and find the controlled combatant once ([#328](https://github.com/kornifex/FVTT-Genesys/issues/328)) ([5bb865a](https://github.com/kornifex/FVTT-Genesys/commit/5bb865a55be75966a478de4e7481e9d4b140d46d))
* declare each world and client setting once, in a typed table ([#313](https://github.com/kornifex/FVTT-Genesys/issues/313)) ([b69396f](https://github.com/kornifex/FVTT-Genesys/commit/b69396f3d0f0953fc8e7e614b4adb54427e92cf7))
* declare the DataModels' shared schemas once, and read an actor's items by type without casts ([#370](https://github.com/kornifex/FVTT-Genesys/issues/370)) ([57801bb](https://github.com/kornifex/FVTT-Genesys/commit/57801bb1fbbefd69fcd255d38490bb16e9c25015))
* declare the document types in the manifest instead of template.json ([#333](https://github.com/kornifex/FVTT-Genesys/issues/333)) ([1adcb8e](https://github.com/kornifex/FVTT-Genesys/commit/1adcb8e791a6d24490a524d733f988e59c04c39f))
* **dice:** keep the rule modules free of Foundry classes, and fail a unit test that reaches an unstubbed Foundry global ([#330](https://github.com/kornifex/FVTT-Genesys/issues/330)) ([536b914](https://github.com/kornifex/FVTT-Genesys/commit/536b914b1f2864827064aea81c4e533bf349cf87))
* **dice:** name the dice glyphs in one table, and roll checks through plain functions ([#334](https://github.com/kornifex/FVTT-Genesys/issues/334)) ([f224f77](https://github.com/kornifex/FVTT-Genesys/commit/f224f777fcda73859853b763767e5484705b214e))
* **dice:** share the skill and attack chat cards' common part, and compute what they show in RollResults.ts ([#332](https://github.com/kornifex/FVTT-Genesys/issues/332)) ([7f6bb54](https://github.com/kornifex/FVTT-Genesys/commit/7f6bb54be2daa0d793530979f2b30ae86bb449b8))
* **dice:** type the Dice Prompt's roll as a union, and trim DicePrompt.vue's copies ([#342](https://github.com/kornifex/FVTT-Genesys/issues/342)) ([a34b01b](https://github.com/kornifex/FVTT-Genesys/commit/a34b01bae4a68c133cb50bca29c11bf8a9f8a296))
* drop Foundry v12 from main ([#290](https://github.com/kornifex/FVTT-Genesys/issues/290)) ([a0fbd47](https://github.com/kornifex/FVTT-Genesys/commit/a0fbd47b36afb041ccf75be367ba0d89649794b2))
* enrich text through one function ([#360](https://github.com/kornifex/FVTT-Genesys/issues/360)) ([a1283a0](https://github.com/kornifex/FVTT-Genesys/commit/a1283a0f7db1a8835e1ba967b276e4abeac7354f))
* **item:** handle item qualities in one module, and show them with one component ([#331](https://github.com/kornifex/FVTT-Genesys/issues/331)) ([a4709ea](https://github.com/kornifex/FVTT-Genesys/commit/a4709ea806e46cef184b338d2582b53b1984fdea))
* move the data models onto TypeDataModel ([#379](https://github.com/kornifex/FVTT-Genesys/issues/379)) ([8090a3b](https://github.com/kornifex/FVTT-Genesys/commit/8090a3bb6f1d7cee8165294048c2f10129261a84))
* move the rules left in components and DataModels into tested modules, and write each once ([#337](https://github.com/kornifex/FVTT-Genesys/issues/337)) ([957ffd6](https://github.com/kornifex/FVTT-Genesys/commit/957ffd68183f061bd8fa7cd49e120bb01087d086))
* read a document's system as its subtype's DataModel, without the systemData getters ([#381](https://github.com/kornifex/FVTT-Genesys/issues/381)) ([8734623](https://github.com/kornifex/FVTT-Genesys/commit/8734623fb134c1345cf9e19644c9733972be1236))
* replace the Foundry globals deprecated since v13, and lint them ([#349](https://github.com/kornifex/FVTT-Genesys/issues/349)) ([b87aaaf](https://github.com/kornifex/FVTT-Genesys/commit/b87aaaf05a842d66e660dd20c3e7f0d0ed7cc162))
* replace the TypeScript enums and interfaces with as-const objects and type aliases ([#339](https://github.com/kornifex/FVTT-Genesys/issues/339)) ([394c50c](https://github.com/kornifex/FVTT-Genesys/commit/394c50c1f7717fced1fc760d1436aefaf6e20f60))
* resolve a dropped item once in the base actor and item sheets ([#336](https://github.com/kornifex/FVTT-Genesys/issues/336)) ([9518bcd](https://github.com/kornifex/FVTT-Genesys/commit/9518bcdcede52b77985189b825ebdbd86e2acdd4))
* share the prompts' plumbing, and move the entry point's bodies to their domains ([#347](https://github.com/kornifex/FVTT-Genesys/issues/347)) ([9ee8348](https://github.com/kornifex/FVTT-Genesys/commit/9ee83481da638fc4fed275f71465ed0618c7a141))
* type the system against fvtt-types for Foundry v14 ([#377](https://github.com/kornifex/FVTT-Genesys/issues/377)) ([4ed5327](https://github.com/kornifex/FVTT-Genesys/commit/4ed5327fb1eb466773c053493061ca2efe225970))
* **ui:** edit enriched text in Foundry's prose-mirror element ([#369](https://github.com/kornifex/FVTT-Genesys/issues/369)) ([9bbbf3a](https://github.com/kornifex/FVTT-Genesys/commit/9bbbf3a393656b54b68f232e8e6bc924671309f9))
* **ui:** extract the Vue patterns copied across sheets and components ([#343](https://github.com/kornifex/FVTT-Genesys/issues/343)) ([ffa1767](https://github.com/kornifex/FVTT-Genesys/commit/ffa1767818aa8c27a8d95e7a1486e6ec29d4a0d5))
* **ui:** give the Vue sheets one contract for reading their document ([#368](https://github.com/kornifex/FVTT-Genesys/issues/368)) ([839da5e](https://github.com/kornifex/FVTT-Genesys/commit/839da5eb36c82b6866b1d5086f370507a9238cfa))
* **ui:** lay out the data rows of the item sheets and the adversaries' Source row once ([#362](https://github.com/kornifex/FVTT-Genesys/issues/362)) ([8d71948](https://github.com/kornifex/FVTT-Genesys/commit/8d719481afebd4bad323d4ef56c132986cc3fd64))
* **ui:** move the item actions and view rules out of the Vue components ([#372](https://github.com/kornifex/FVTT-Genesys/issues/372)) ([aef736d](https://github.com/kornifex/FVTT-Genesys/commit/aef736dbec9fd3473a5ff6757ee8282ea0546c7e))
* **ui:** route the remaining item edits and deletes through the item actions, which ask first ([#374](https://github.com/kornifex/FVTT-Genesys/issues/374)) ([ca871c7](https://github.com/kornifex/FVTT-Genesys/commit/ca871c7b8fc51de42bc68d4f1d849765f3d31a29))
* **ui:** scope the Vue styles, and say why the rest aren't ([#350](https://github.com/kornifex/FVTT-Genesys/issues/350)) ([8c322b4](https://github.com/kornifex/FVTT-Genesys/commit/8c322b4f1082fd128b47a4c5f94523a8a6616d0a))
* **ui:** share the prompts' window rules in one mixin ([#361](https://github.com/kornifex/FVTT-Genesys/issues/361)) ([975c945](https://github.com/kornifex/FVTT-Genesys/commit/975c9457e305e08a2b6740370a14355e34d9f8ca))
* **ui:** weigh the sheets' field rules as little as v13 needs, and drop reset.input's selector ([#317](https://github.com/kornifex/FVTT-Genesys/issues/317)) ([7b6ca5b](https://github.com/kornifex/FVTT-Genesys/commit/7b6ca5bd2104546f2dca357ac5a725ec2ef77ef1))


### Documentation

* define Expired Effect ([#386](https://github.com/kornifex/FVTT-Genesys/issues/386)) ([454fdb3](https://github.com/kornifex/FVTT-Genesys/commit/454fdb30253199ced1d24cf9b8dca6e1ee35963f))
* define Weapon Profile and Silhouette, and record ADR 0007 ([#385](https://github.com/kornifex/FVTT-Genesys/issues/385)) ([ebc50ef](https://github.com/kornifex/FVTT-Genesys/commit/ebc50ef47dfc903ca03cd7c3df2b575ed2f9cac3))
* fix, trim and complete the comments and JSDoc ([#351](https://github.com/kornifex/FVTT-Genesys/issues/351)) ([9ac77b2](https://github.com/kornifex/FVTT-Genesys/commit/9ac77b2ab324e72ddf04c884f1a96e8ab3d35ef0))
* record why the create dialog doesn't group the types ([#301](https://github.com/kornifex/FVTT-Genesys/issues/301)) ([8b41767](https://github.com/kornifex/FVTT-Genesys/commit/8b417675ccd81865e50fffac1fbc1ad406f62cd3))
* type the system against fvtt-types for Foundry v14 ([#376](https://github.com/kornifex/FVTT-Genesys/issues/376)) ([05f8091](https://github.com/kornifex/FVTT-Genesys/commit/05f80913f9b505a775b96c7328e2c8138f1ae2a0))


### Build System

* compile the Skills Compendium from YAML sources into a LevelDB pack ([#287](https://github.com/kornifex/FVTT-Genesys/issues/287)) ([fc0ea57](https://github.com/kornifex/FVTT-Genesys/commit/fc0ea5700bb09b9f449f1374dcd3a4e4743d7d5c))
* ship Vue's runtime-only build, and lay the skill categories out with CSS columns ([#329](https://github.com/kornifex/FVTT-Genesys/issues/329)) ([0bb9834](https://github.com/kornifex/FVTT-Genesys/commit/0bb98349a2c8a90c9b20ff38af45639412c8eb61))


### Continuous Integration

* release the 0.4.x line from its own branch, and set main's next release to 0.5.0 ([#281](https://github.com/kornifex/FVTT-Genesys/issues/281)) ([b62f056](https://github.com/kornifex/FVTT-Genesys/commit/b62f056055094ab39a6bf5485e0a959026551ea2))
* set the next release to 0.4.0, and merge a release candidate before the table tests ([#278](https://github.com/kornifex/FVTT-Genesys/issues/278)) ([d11bbd3](https://github.com/kornifex/FVTT-Genesys/commit/d11bbd33d5d1b5eb4073d8efc9055c053f0f65f5))
* set the next release to 0.5.0-rc.1 ([#406](https://github.com/kornifex/FVTT-Genesys/issues/406)) ([a462fe0](https://github.com/kornifex/FVTT-Genesys/commit/a462fe0dba9949037d9763973a3f24c5e11393f9))


### Miscellaneous Chores

* give third-party reporters issue forms for bugs and feature requests ([#303](https://github.com/kornifex/FVTT-Genesys/issues/303)) ([767e1a0](https://github.com/kornifex/FVTT-Genesys/commit/767e1a0d733a6c575f3868dad46ab797a191f758))


### Tests

* **combat:** prove that a claimed row's roll and Initiative Skill buttons follow the owners of its slot's origin ([#323](https://github.com/kornifex/FVTT-Genesys/issues/323)) ([cefb122](https://github.com/kornifex/FVTT-Genesys/commit/cefb1225f8d8ab4111541bfd8e1ca47c0c6e99e5))
* document the steps named by their section alone, and give one step a single section ([#341](https://github.com/kornifex/FVTT-Genesys/issues/341)) ([97de390](https://github.com/kornifex/FVTT-Genesys/commit/97de390ff20daec546aa72a8c921f6c4f0a10809))
* **effects:** read an effect's duration in rounds in each Foundry version's shape ([#312](https://github.com/kornifex/FVTT-Genesys/issues/312)) ([36a7125](https://github.com/kornifex/FVTT-Genesys/commit/36a71255caa7ee82db0997611115cce7e503f1b2))
* expect v14's ownership and detach header controls in the sheets scenario ([#299](https://github.com/kornifex/FVTT-Genesys/issues/299)) ([e897261](https://github.com/kornifex/FVTT-Genesys/commit/e897261249bcbbb80381801ce8ebac53d0ce261b))
* find the Effects view, click its Edit and Add buttons and grant ownership through shared e2e helpers ([#404](https://github.com/kornifex/FVTT-Genesys/issues/404)) ([310958b](https://github.com/kornifex/FVTT-Genesys/commit/310958bff160102209c93764f87ba3a638a9efe0))
* **item:** prove the state and delete paths the checklist names but no sheet offers, and read a script's Used write ([#321](https://github.com/kornifex/FVTT-Genesys/issues/321)) ([11eb462](https://github.com/kornifex/FVTT-Genesys/commit/11eb4622a2b7dabd06535fe616090a6b5bf2fe9f))
* lint the deprecated Foundry globals in the e2e code too, and through the global object ([#363](https://github.com/kornifex/FVTT-Genesys/issues/363)) ([590769d](https://github.com/kornifex/FVTT-Genesys/commit/590769daabc176d4d7fff8fdd6ed26d71e6b020c))
* **migration:** seed the migrations scenario's legacy copies from their effects as written, on Foundry v14 ([#311](https://github.com/kornifex/FVTT-Genesys/issues/311)) ([e5bb66e](https://github.com/kornifex/FVTT-Genesys/commit/e5bb66e39382bb77265c7b1786070df6bc459c28))
* read and toggle the Effects tab's rows and give users a permission level through shared e2e helpers ([#401](https://github.com/kornifex/FVTT-Genesys/issues/401)) ([8291d7b](https://github.com/kornifex/FVTT-Genesys/commit/8291d7bb1707b96485d993b2059cfdbdc224e2a4))
* read the Dice Prompt's roll type from its roll in the vehicle scenario ([#345](https://github.com/kornifex/FVTT-Genesys/issues/345)) ([d0b8bce](https://github.com/kornifex/FVTT-Genesys/commit/d0b8bcef2e53feaf00ebb010f9cdb9760260eaea))
* run the e2e harness on Foundry v14, and declare the system verified on v14 ([#291](https://github.com/kornifex/FVTT-Genesys/issues/291)) ([367afc1](https://github.com/kornifex/FVTT-Genesys/commit/367afc125cb181af79e7310dec9a55fcbb1c8303))
* **ui:** prove that Escape leaves a sheet open while a field has the focus, and closes it otherwise ([#322](https://github.com/kornifex/FVTT-Genesys/issues/322)) ([392ab9e](https://github.com/kornifex/FVTT-Genesys/commit/392ab9eeaf957eed0bd03bb9519e88c6a9702f16))
* **ui:** prove the directories' create dialogs open where the directory asks, without a compatibility warning ([#314](https://github.com/kornifex/FVTT-Genesys/issues/314)) ([5bba2bb](https://github.com/kornifex/FVTT-Genesys/commit/5bba2bbb73866dab04ec4eb7c49c06776c3b1944))

## [0.4.0-rc.1](https://github.com/kornifex/FVTT-Genesys/compare/v0.3.1...v0.4.0-rc.1) (2026-10-27)


### ⚠ BREAKING CHANGES

* **item:** the `state` field of equipment no longer accepts `used`. A macro or module writing `system.state = 'used'` now fails validation, and a consumable it set to Used stops applying its effects. An item already saved as Used reads as Carried; the database keeps `used` until the item is saved again.
* **effects:** world migration 3 deletes the actor-side copies of item effects; it can't be undone without a world backup.
* **ui:** the system's sheets are ApplicationV2 windows. Their render hooks are `renderCharacterSheet`, `renderActorSheetV2`, `renderDocumentSheetV2`, `renderApplicationV2` (with an `HTMLElement`) instead of `renderActorSheet`/`renderItemSheet` with jQuery, so a module hooking the AppV1 names no longer sees them.

### Features

* **dice:** roll a skill the actor lacks from the Skills Compendium as an Unranked Skill Check, for every actor type ([#42](https://github.com/kornifex/FVTT-Genesys/issues/42)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **dice:** roll the skill check links of the check enricher from journal entries, chat messages and item sheets ([#44](https://github.com/kornifex/FVTT-Genesys/issues/44)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **item:** let an actor choose the Attack Skill of a weapon listing several skills ([#196](https://github.com/kornifex/FVTT-Genesys/issues/196)) ([bdc4c74](https://github.com/kornifex/FVTT-Genesys/commit/bdc4c74f8a0c73316d9e0363be2c2271180cafce))
* **ui:** hide the Talent Pyramid summary under Ignore Talent Pyramid ([#110](https://github.com/kornifex/FVTT-Genesys/issues/110)) ([61bf7b9](https://github.com/kornifex/FVTT-Genesys/commit/61bf7b95b4164280f28b789e666abb8f4399d078))


### Bug Fixes

* **actor:** add a targeted vehicle's defense and target effects to an attack against it ([#201](https://github.com/kornifex/FVTT-Genesys/issues/201)) ([8a47968](https://github.com/kornifex/FVTT-Genesys/commit/8a4796869fe4b82c8e0c975f85924864a2e4be07))
* **actor:** cap an adversary's defense at 4 ([#194](https://github.com/kornifex/FVTT-Genesys/issues/194)) ([a3ea524](https://github.com/kornifex/FVTT-Genesys/commit/a3ea5243dde6c9d6b57be8f8f71bda11978f08f0))
* **actor:** cap the skill ranks bought during Character Creation at 2 ([#19](https://github.com/kornifex/FVTT-Genesys/issues/19)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **actor:** count negative encumbrance once per item on characters and vehicles ([#173](https://github.com/kornifex/FVTT-Genesys/issues/173)) ([d012c4b](https://github.com/kornifex/FVTT-Genesys/commit/d012c4b413ff22daf20364e174c7f4cadf40ead1))
* **actor:** delete only the items an archetype granted when it is removed ([#142](https://github.com/kornifex/FVTT-Genesys/issues/142)) ([b51224c](https://github.com/kornifex/FVTT-Genesys/commit/b51224c1bfddac54187dd0a8226a3b4216c847a1))
* **actor:** keep a token bar change at 0 or more, and a character's wounds at twice their threshold or less ([#195](https://github.com/kornifex/FVTT-Genesys/issues/195)) ([820b08b](https://github.com/kornifex/FVTT-Genesys/commit/820b08bad77087aad820443c22722dcd20d9c48e))
* **actor:** let a character wear one armor, and count only its soak and defense ([#193](https://github.com/kornifex/FVTT-Genesys/issues/193)) ([dfe27ce](https://github.com/kornifex/FVTT-Genesys/commit/dfe27ce7b137730c399b1780370e2b2d0f7af6aa))
* **actor:** make a skill added to a character a career skill when their Career lists it ([#199](https://github.com/kornifex/FVTT-Genesys/issues/199)) ([4132695](https://github.com/kornifex/FVTT-Genesys/commit/413269553dbc1da464b7ef77eb053e9ec1f5bebf))
* **actor:** raise a characteristic from its base rating, without its Active Effects ([#198](https://github.com/kornifex/FVTT-Genesys/issues/198)) ([c88a53e](https://github.com/kornifex/FVTT-Genesys/commit/c88a53ee4e3cb98ba807c8fa53484669913a23ee))
* **actor:** raise characteristics during Character Creation only, and check XP and the Talent Pyramid when ranking up a talent from the Talents tab ([#27](https://github.com/kornifex/FVTT-Genesys/issues/27)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **actor:** refuse a third super-characteristic ([#202](https://github.com/kornifex/FVTT-Genesys/issues/202)) ([d018a99](https://github.com/kornifex/FVTT-Genesys/commit/d018a99476acf63037abb9ba9fb77ef070d83763))
* **combat:** count leftover Failures and Threats as no Successes and no Advantage in initiative ([#189](https://github.com/kornifex/FVTT-Genesys/issues/189)) ([fc7ff36](https://github.com/kornifex/FVTT-Genesys/commit/fc7ff369c03824fad1dafae344721d43fc1b36e7))
* **combat:** default a combatant's Initiative Skill to Vigilance ([#192](https://github.com/kornifex/FVTT-Genesys/issues/192)) ([9a9578e](https://github.com/kornifex/FVTT-Genesys/commit/9a9578e9c9c0cadec941d207bcdf364d7fe7a781))
* **combat:** keep a Claim on its Initiative Slot when a reroll or an added slot changes the turn order ([#28](https://github.com/kornifex/FVTT-Genesys/issues/28)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **combat:** keep the turn on its Initiative Slot when an Extra Slot is added ([#54](https://github.com/kornifex/FVTT-Genesys/issues/54)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **combat:** keep the turn without turn events when initiative is written ([#59](https://github.com/kornifex/FVTT-Genesys/issues/59)) ([cee344d](https://github.com/kornifex/FVTT-Genesys/commit/cee344d5f5f3fb9024c626ab651a93bca29026cb))
* **combat:** list Initiative Slots in the Foundry v13 Combat Tracker, refuse claims of claimed slots and of combatants that already acted, and apply the roll mode to attack and initiative messages ([#18](https://github.com/kornifex/FVTT-Genesys/issues/18)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **combat:** roll a claimed Initiative Slot for its origin, not its claimant ([#34](https://github.com/kornifex/FVTT-Genesys/issues/34)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **combat:** roll each initiative into its own Initiative Slot after Extra Slots were added ([#45](https://github.com/kornifex/FVTT-Genesys/issues/45)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **combat:** take an Initiative Slot's side from player ownership of the actor ([#190](https://github.com/kornifex/FVTT-Genesys/issues/190)) ([a26408a](https://github.com/kornifex/FVTT-Genesys/commit/a26408a10ebf2ed16ffefc6bebc969931192994b))
* **dice:** add a Difficulty die for a [@check](https://github.com/check) link's upgrade with none left to upgrade ([#188](https://github.com/kornifex/FVTT-Genesys/issues/188)) ([ac2f742](https://github.com/kornifex/FVTT-Genesys/commit/ac2f7425d0434406d128d6a9ce9f35d31cc9c155))
* **dice:** apply Pool Modifications to every initiative roll, and update them when the dice prompt's characteristic changes ([#43](https://github.com/kornifex/FVTT-Genesys/issues/43)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **dice:** leave a [@pool](https://github.com/pool) enricher with a wrong-case glyph as plain text ([#115](https://github.com/kornifex/FVTT-Genesys/issues/115)) ([2846e4b](https://github.com/kornifex/FVTT-Genesys/commit/2846e4bbbcbe7a9fecbb80187d7e881221d96645))
* **dice:** roll every skill check with a characteristic when skills are uncoupled ([#204](https://github.com/kornifex/FVTT-Genesys/issues/204)) ([543709a](https://github.com/kornifex/FVTT-Genesys/commit/543709a4c4420bee50a8d731b9cbbd7f36001a3b))
* **effects:** keep a Pool Modification's skill outside the Skills Compendium, and list no empty defense Pool Modification ([#33](https://github.com/kornifex/FVTT-Genesys/issues/33)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **effects:** suppress the effects of equipment that can be equipped while it is held in a Container ([#235](https://github.com/kornifex/FVTT-Genesys/issues/235)) ([87dc36a](https://github.com/kornifex/FVTT-Genesys/commit/87dc36ab8df2ac7a98bd7c8af4c561614febb368))
* **item:** count items in nested containers without freezing the sheet, and take back a Career's skills whatever their case ([#30](https://github.com/kornifex/FVTT-Genesys/issues/30)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **item:** keep a talent's tier from 1 to 5, and read a tier saved above 5 as tier 5 ([#200](https://github.com/kornifex/FVTT-Genesys/issues/200)) ([9693d21](https://github.com/kornifex/FVTT-Genesys/commit/9693d2175dc79957eb5110e90ee6884cbea8398f))
* **item:** post talent and item cards through one module ([#130](https://github.com/kornifex/FVTT-Genesys/issues/130)) ([0d7c8c1](https://github.com/kornifex/FVTT-Genesys/commit/0d7c8c1f5c8348f0ddba4d586ffecd62915a0c8c))
* **item:** show Formidable injuries and critical hits, and read severity from one module ([#126](https://github.com/kornifex/FVTT-Genesys/issues/126)) ([60ddfd6](https://github.com/kornifex/FVTT-Genesys/commit/60ddfd6a41dd4c4218b1bd11e158fdc5dd6444f9))
* **migration:** migrate the actors of unlinked tokens and of locked compendiums ([#41](https://github.com/kornifex/FVTT-Genesys/issues/41)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **ui:** derive the Palette's shades with color-mix ([#99](https://github.com/kornifex/FVTT-Genesys/issues/99)) ([498214a](https://github.com/kornifex/FVTT-Genesys/commit/498214a9b2fa0a8c40c7e8e9a453d3e505bb7c04))
* **ui:** leave the Story Points unchanged when the GM types something other than a count ([#277](https://github.com/kornifex/FVTT-Genesys/issues/277)) ([e1a8a0f](https://github.com/kornifex/FVTT-Genesys/commit/e1a8a0f9c7039accc33c193ca436f813775cd827))
* **ui:** show an item's update in its inventory row at once ([#203](https://github.com/kornifex/FVTT-Genesys/issues/203)) ([d476d11](https://github.com/kornifex/FVTT-Genesys/commit/d476d11e277890abb5376f5050d9a1a6ca485990))
* **vehicle:** delete a crew member without an error once an unlinked vehicle token they crew is gone ([#234](https://github.com/kornifex/FVTT-Genesys/issues/234)) ([89c8c26](https://github.com/kornifex/FVTT-Genesys/commit/89c8c26fca87e730296a5c10a71b46440a7f145b))
* **vehicle:** delete a vehicle together with its crew without errors ([#129](https://github.com/kornifex/FVTT-Genesys/issues/129)) ([7185fef](https://github.com/kornifex/FVTT-Genesys/commit/7185fef4d87b04ad8d8e88d81ca47206fff8a5c0))
* **vehicle:** refresh the vehicle's Skills tab when its Roles or crew skills change ([#127](https://github.com/kornifex/FVTT-Genesys/issues/127)) ([ff90e6d](https://github.com/kornifex/FVTT-Genesys/commit/ff90e6db0bd6a1e2d39fd364de6cff7216b5d630))


### Code Refactoring

* **actor:** compute a Minion Group's wound threshold, remaining members and skill rank in one module ([#132](https://github.com/kornifex/FVTT-Genesys/issues/132)) ([8c61216](https://github.com/kornifex/FVTT-Genesys/commit/8c61216b95ae86fc561fd8022f68fa8eae849450))
* **actor:** list characteristics and toggle super-characteristics through one module ([#136](https://github.com/kornifex/FVTT-Genesys/issues/136)) ([dfd9c09](https://github.com/kornifex/FVTT-Genesys/commit/dfd9c099a31116e33d0e496c1b0d30c34af9f297))
* **actor:** move a Career's skills and Free Ranks into Career.ts ([#171](https://github.com/kornifex/FVTT-Genesys/issues/171)) ([b01e67a](https://github.com/kornifex/FVTT-Genesys/commit/b01e67a08f1ed71be14b61fe8a1a354b2760172c))
* **actor:** move a character's encumbrance threshold and an item's damage steps into modules ([#177](https://github.com/kornifex/FVTT-Genesys/issues/177)) ([d01d2dc](https://github.com/kornifex/FVTT-Genesys/commit/d01d2dcda7b2fa5b591af94b4453eaf390324e52))
* **actor:** receive every inventory drop through one module ([#103](https://github.com/kornifex/FVTT-Genesys/issues/103)) ([3c299a8](https://github.com/kornifex/FVTT-Genesys/commit/3c299a87d6ed710e3df565008d68c631575fca78))
* **actor:** receive items dropped on an adversary and change its talent ranks through one module ([#131](https://github.com/kornifex/FVTT-Genesys/issues/131)) ([b3b93f5](https://github.com/kornifex/FVTT-Genesys/commit/b3b93f5d0e5af97fb7a61b5d435b8aaf47e18bdb))
* **actor:** turn the character's Skills tab into an adapter over the skill and characteristic rules ([#114](https://github.com/kornifex/FVTT-Genesys/issues/114)) ([9e317ce](https://github.com/kornifex/FVTT-Genesys/commit/9e317ce2d6f59cd0d93266a1e6445c4d6129a659))
* **combat:** move a character's soak and defense, and an attack's damage, into modules ([#165](https://github.com/kornifex/FVTT-Genesys/issues/165)) ([f4e06d3](https://github.com/kornifex/FVTT-Genesys/commit/f4e06d3ccf2fa3d3b83cf2106d4ff519aa7cc708))
* declare the v13 Foundry APIs the system uses ([#94](https://github.com/kornifex/FVTT-Genesys/issues/94)) ([e031010](https://github.com/kornifex/FVTT-Genesys/commit/e031010e6d620fac95891773258bdaa6bd409c61))
* **dice:** compute success chances from the TypeScript dice code ([#90](https://github.com/kornifex/FVTT-Genesys/issues/90)) ([43a7631](https://github.com/kornifex/FVTT-Genesys/commit/43a7631bc7c66ae8f37487bdbf39aea57b2acae7))
* **dice:** move a roll's results, a check link's difficulty and the Story Point pools into modules ([#157](https://github.com/kornifex/FVTT-Genesys/issues/157)) ([2be5750](https://github.com/kornifex/FVTT-Genesys/commit/2be5750b9e2d9f7f0408b27ffcdb24157d9436d8))
* **dice:** move the lock of a skill check's characteristic into Check.ts ([#184](https://github.com/kornifex/FVTT-Genesys/issues/184)) ([d4567ca](https://github.com/kornifex/FVTT-Genesys/commit/d4567ca59815a262f032dc0ede508997892742a8))
* **effects:** keep item effects on their items ([#102](https://github.com/kornifex/FVTT-Genesys/issues/102)) ([263a587](https://github.com/kornifex/FVTT-Genesys/commit/263a5879f97f858ce54ac6658fb1e297ea267013))
* **effects:** read Pool Modifications from one module ([#26](https://github.com/kornifex/FVTT-Genesys/issues/26)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **effects:** read the characteristics of the effect sheets' selects from Characteristics.ts ([#141](https://github.com/kornifex/FVTT-Genesys/issues/141)) ([00500a3](https://github.com/kornifex/FVTT-Genesys/commit/00500a311f19a45f2eef3175a5cca02665a7a90c))
* **i18n:** read the characteristics and their abbreviations from Characteristics.ts everywhere ([#139](https://github.com/kornifex/FVTT-Genesys/issues/139)) ([a243b26](https://github.com/kornifex/FVTT-Genesys/commit/a243b263ab979b94a5b2b00301704d02673950e1))
* **item:** compute a weapon's damage and firing arcs in one module ([#134](https://github.com/kornifex/FVTT-Genesys/issues/134)) ([8d248e3](https://github.com/kornifex/FVTT-Genesys/commit/8d248e3d0d0437fd78dcb0eb991e9cbfbc1e56bb))
* **item:** drop the Used Equipment State, whose consumable effects nothing could reach ([#239](https://github.com/kornifex/FVTT-Genesys/issues/239)) ([b4601c5](https://github.com/kornifex/FVTT-Genesys/commit/b4601c5b483fcf892f83d96354870b36e52136d2))
* **item:** move the tier a talent's ranks are bought at into Talents.ts ([#175](https://github.com/kornifex/FVTT-Genesys/issues/175)) ([eca9993](https://github.com/kornifex/FVTT-Genesys/commit/eca99931809a0202df6df6980432b34f55e442b2))
* load the Skills Compendium through one function ([#100](https://github.com/kornifex/FVTT-Genesys/issues/100)) ([27cf152](https://github.com/kornifex/FVTT-Genesys/commit/27cf1525aed057036a8d45717292243ef4494648))
* move the logic of [#37](https://github.com/kornifex/FVTT-Genesys/issues/37) items into pure modules ([#222](https://github.com/kornifex/FVTT-Genesys/issues/222)) ([d4c5708](https://github.com/kornifex/FVTT-Genesys/commit/d4c5708c11b8f6b64e44a115ef80a46ac8f7da91))
* rename files and exports to the written conventions ([#85](https://github.com/kornifex/FVTT-Genesys/issues/85)) ([73996e1](https://github.com/kornifex/FVTT-Genesys/commit/73996e1d232c1cab9ef3f61b55615543fd7df1ff))
* rename isOwnedSkillDrop after what it decides ([#233](https://github.com/kornifex/FVTT-Genesys/issues/233)) ([b4bef74](https://github.com/kornifex/FVTT-Genesys/commit/b4bef74ed621af738a6b61786e6a7c82817fbe2b))
* share the logic duplicated between data models, inventory tabs, archetypes and the dice prompt ([#21](https://github.com/kornifex/FVTT-Genesys/issues/21)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **ui:** move the Vue sheets to ApplicationV2 ([#95](https://github.com/kornifex/FVTT-Genesys/issues/95)) ([ada3c8e](https://github.com/kornifex/FVTT-Genesys/commit/ada3c8e721a9bb15e0e80d1f3405abc41a06a7d8))
* **ui:** share the Effects tab and the enriched source of the Vue sheets ([#101](https://github.com/kornifex/FVTT-Genesys/issues/101)) ([c8c30ef](https://github.com/kornifex/FVTT-Genesys/commit/c8c30ef8fdd3316af116e22d7c0149e539a6560b))
* use the glossary's terms for checks and Initiative Slot sides ([#20](https://github.com/kornifex/FVTT-Genesys/issues/20)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* **vehicle:** arrange a vehicle's Crew in one module ([#109](https://github.com/kornifex/FVTT-Genesys/issues/109)) ([a483c6f](https://github.com/kornifex/FVTT-Genesys/commit/a483c6f4095a77515be3a18df6b93b36c5f87caf))
* **vehicle:** find the crew who roll a skill for a vehicle in CrewRoster ([#133](https://github.com/kornifex/FVTT-Genesys/issues/133)) ([df684bb](https://github.com/kornifex/FVTT-Genesys/commit/df684bbe15950bc3a84872f49b2bdb938d6c16a4))


### Documentation

* define Ability in the glossary ([#138](https://github.com/kornifex/FVTT-Genesys/issues/138)) ([5ff5cac](https://github.com/kornifex/FVTT-Genesys/commit/5ff5cacf33c13fa414fef45ea2963b21b1cb9c1d))
* define Core Rulebook, Alternate Rule and House Rule in the glossary ([#154](https://github.com/kornifex/FVTT-Genesys/issues/154)) ([3f875ba](https://github.com/kornifex/FVTT-Genesys/commit/3f875ba05f0bf037b3c9d91b4a1b0294fcda0606))
* keep Foundry v12 on a maintenance branch once main moves to v14 ([#108](https://github.com/kornifex/FVTT-Genesys/issues/108)) ([ea59304](https://github.com/kornifex/FVTT-Genesys/commit/ea593044213e4ae11f51bb3d2d917348b83678a0))
* keep the vendored Foundry types until v12 leaves support ([#93](https://github.com/kornifex/FVTT-Genesys/issues/93)) ([228d6d9](https://github.com/kornifex/FVTT-Genesys/commit/228d6d9743f1479e926ccbda4ff259c048c755be))
* list the container query polyfill in the further licenses ([#19](https://github.com/kornifex/FVTT-Genesys/issues/19)) ([b3fa86a](https://github.com/kornifex/FVTT-Genesys/commit/b3fa86a8e2e71d600454932a6a59afbaf94a5187))
* point the documentation links to the fork's wiki ([#97](https://github.com/kornifex/FVTT-Genesys/issues/97)) ([9858137](https://github.com/kornifex/FVTT-Genesys/commit/98581374c91fe04f3edec2499360bb88382a3647))
* record why a spent Story Point moves to the other pool at once ([#187](https://github.com/kornifex/FVTT-Genesys/issues/187)) ([1a55454](https://github.com/kornifex/FVTT-Genesys/commit/1a55454b20df56aef09d8a1a507713fc8638c3cb))
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
* mark the v12-shaped code that carried no v12 marker ([#261](https://github.com/kornifex/FVTT-Genesys/issues/261)) ([9132502](https://github.com/kornifex/FVTT-Genesys/commit/91325025f603a293331a9b34d39bee0c4021b7d8))
* remove dead files, code, dependencies and upstream leftovers ([#76](https://github.com/kornifex/FVTT-Genesys/issues/76)) ([2e50610](https://github.com/kornifex/FVTT-Genesys/commit/2e5061021b109697c9b954f42f37d825ff69ce52))
* skip the 140-column reformat in git blame ([#84](https://github.com/kornifex/FVTT-Genesys/issues/84)) ([8c4cae6](https://github.com/kornifex/FVTT-Genesys/commit/8c4cae651d86540b98c7a34f2b795d21916f52ce))


### Tests

* **actor:** pin the adversary and Extra Slot rules to the Core Rulebook pages ([#179](https://github.com/kornifex/FVTT-Genesys/issues/179)) ([a0b49cb](https://github.com/kornifex/FVTT-Genesys/commit/a0b49cb6c6b8d0f27ad9b514e059aa15cd46ecd2))
* **actor:** pin the character creation and XP cost rules to the Core Rulebook pages ([#172](https://github.com/kornifex/FVTT-Genesys/issues/172)) ([35fadc5](https://github.com/kornifex/FVTT-Genesys/commit/35fadc5ba8c91fbecfceea380ed2c22cd17653b9))
* **actor:** pin the characteristics, derived attributes and super-characteristics to the Core Rulebook pages ([#183](https://github.com/kornifex/FVTT-Genesys/issues/183)) ([382ab0d](https://github.com/kornifex/FVTT-Genesys/commit/382ab0d70563cb46a79f11849ebb04619af4408e))
* **combat:** pin the initiative, Claim and defense rules to the Core Rulebook pages ([#166](https://github.com/kornifex/FVTT-Genesys/issues/166)) ([6232c23](https://github.com/kornifex/FVTT-Genesys/commit/6232c23dac10ec9f6f9e442d8c26572cda31da92))
* cover the [#37](https://github.com/kornifex/FVTT-Genesys/issues/37) items whose function exists ([#221](https://github.com/kornifex/FVTT-Genesys/issues/221)) ([0952d19](https://github.com/kornifex/FVTT-Genesys/commit/0952d194c7ed6f0afbb220eb19a59073cd32b0c9))
* cover the adversaries items of [#37](https://github.com/kornifex/FVTT-Genesys/issues/37) with an e2e scenario ([#227](https://github.com/kornifex/FVTT-Genesys/issues/227)) ([ecc9ce9](https://github.com/kornifex/FVTT-Genesys/commit/ecc9ce947be3a28da0aad23ab6fdc9fb347d8181))
* cover the character items of [#37](https://github.com/kornifex/FVTT-Genesys/issues/37) with an e2e scenario ([#225](https://github.com/kornifex/FVTT-Genesys/issues/225)) ([9ebd8cd](https://github.com/kornifex/FVTT-Genesys/commit/9ebd8cdc91a7b4feb8c30adacd142a3d66f1d574))
* cover the combat items of [#37](https://github.com/kornifex/FVTT-Genesys/issues/37) with an e2e scenario ([#231](https://github.com/kornifex/FVTT-Genesys/issues/231)) ([7b26bcd](https://github.com/kornifex/FVTT-Genesys/commit/7b26bcd206211d25847f3f0bde5dd14deadba2d3))
* cover the dicePrompt items of [#37](https://github.com/kornifex/FVTT-Genesys/issues/37) with an e2e scenario ([#223](https://github.com/kornifex/FVTT-Genesys/issues/223)) ([beb7740](https://github.com/kornifex/FVTT-Genesys/commit/beb7740c63c3105ba16a622d76c0af0de3df9558))
* cover the inventory items of [#37](https://github.com/kornifex/FVTT-Genesys/issues/37) with an e2e scenario ([#224](https://github.com/kornifex/FVTT-Genesys/issues/224)) ([b2a4f5b](https://github.com/kornifex/FVTT-Genesys/commit/b2a4f5b7dbe7c126a0c0005be6a8aacbc4628537))
* cover the migrations items of [#37](https://github.com/kornifex/FVTT-Genesys/issues/37) with an e2e scenario ([#228](https://github.com/kornifex/FVTT-Genesys/issues/228)) ([ee1c5dc](https://github.com/kornifex/FVTT-Genesys/commit/ee1c5dc23aeb99825cd51299826081952495ae89))
* cover the sheets items of [#37](https://github.com/kornifex/FVTT-Genesys/issues/37) with an e2e scenario ([#229](https://github.com/kornifex/FVTT-Genesys/issues/229)) ([260fd27](https://github.com/kornifex/FVTT-Genesys/commit/260fd279f9152ae55464d2c19810a59eb6192975))
* cover the vehicle items of [#37](https://github.com/kornifex/FVTT-Genesys/issues/37) with an e2e scenario ([#226](https://github.com/kornifex/FVTT-Genesys/issues/226)) ([545a472](https://github.com/kornifex/FVTT-Genesys/commit/545a472671f6b090355bbac79463d7df96fdf26c))
* **dice:** pin the dice, checks and Story Point rules to the Core Rulebook pages ([#158](https://github.com/kornifex/FVTT-Genesys/issues/158)) ([d5e15c5](https://github.com/kornifex/FVTT-Genesys/commit/d5e15c502507629b0f4309bd12b02523feaa6837))
* **dice:** pin Uncoupling Skills from Characteristics and magic attack damage to the Core Rulebook pages ([#185](https://github.com/kornifex/FVTT-Genesys/issues/185)) ([792d482](https://github.com/kornifex/FVTT-Genesys/commit/792d482f2252e9f4dd5fa6eeca292d5afbab211e))
* draw the e2e clients on the GPU when E2E_ANGLE names an ANGLE backend ([#240](https://github.com/kornifex/FVTT-Genesys/issues/240)) ([cdb4bfe](https://github.com/kornifex/FVTT-Genesys/commit/cdb4bfe62382187b462017be24ec6ff0b7f17081))
* **item:** pin encumbrance, weapon damage and item damage to the Core Rulebook pages ([#178](https://github.com/kornifex/FVTT-Genesys/issues/178)) ([aee4cc1](https://github.com/kornifex/FVTT-Genesys/commit/aee4cc1b041004585726906e692e94f447800a5c))
* **item:** pin the difficulty of healing a Critical Injury to the Core Rulebook pages ([#168](https://github.com/kornifex/FVTT-Genesys/issues/168)) ([d09a0d3](https://github.com/kornifex/FVTT-Genesys/commit/d09a0d3e79222c7e737b62ca8645d0fdba524720))
* **item:** pin the skill list and the talent tier rules to the Core Rulebook pages ([#176](https://github.com/kornifex/FVTT-Genesys/issues/176)) ([7d271da](https://github.com/kornifex/FVTT-Genesys/commit/7d271dae2f7e9935b3c3c6fc25532581f51b415a))
* keep a Foundry e2e harness in the repo ([#96](https://github.com/kornifex/FVTT-Genesys/issues/96)) ([cb348bc](https://github.com/kornifex/FVTT-Genesys/commit/cb348bcce264b761781b0de530da5a2a84471b4a))
* make the e2e harness a suite that asserts ([#220](https://github.com/kornifex/FVTT-Genesys/issues/220)) ([fcdd6a0](https://github.com/kornifex/FVTT-Genesys/commit/fcdd6a04f3da1a330978196de5f917d48a6a70e9))
* share the e2e scenarios' page helpers and name every step after its [#37](https://github.com/kornifex/FVTT-Genesys/issues/37) section ([#237](https://github.com/kornifex/FVTT-Genesys/issues/237)) ([78ce659](https://github.com/kornifex/FVTT-Genesys/commit/78ce6593c92c404a087a437fa52abbba0238a6b6))
* **vehicle:** pin the crew, vehicle weapon and Critical Hit rules to the Core Rulebook pages ([#181](https://github.com/kornifex/FVTT-Genesys/issues/181)) ([2ec7596](https://github.com/kornifex/FVTT-Genesys/commit/2ec759695420024a465416dcf44cb1b405305826))
* wait on idle clients, spare the canvas and run the Foundry versions at once in the e2e suite ([#238](https://github.com/kornifex/FVTT-Genesys/issues/238)) ([0a03483](https://github.com/kornifex/FVTT-Genesys/commit/0a0348346c181e97400fd3157dda53ef92da4012))

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
