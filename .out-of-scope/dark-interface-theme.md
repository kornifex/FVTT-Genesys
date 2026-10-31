# Following the dark interface theme

The Genesys sheets and prompts always render in Foundry's light theme. A user who picks the dark interface theme in Foundry v13 or v14 gets dark core windows beside light Genesys sheets.

## Why this is out of scope

Every Vue sheet and prompt forces the light theme (`classes: ['themed', 'theme-light']`, `src/vue/VueSheet.ts`), because their styles were written for AppV1 windows, which v13 kept in the light theme. Foundry would let a sheet follow the user's theme (`DocumentSheetConfig.getSheetThemeForDocument`), but the system has nothing to show in the dark one:

-   the Palette (`src/scss/vars/colors.scss`) has a single variant per Style, and its `paper` and `paper-pattern` colors are what make a sheet look like a printed character sheet;
-   about 120 colors are written directly into some 30 components and stylesheets (`DicePrompt.vue` alone has 31), against 33 uses of the Palette's `--genesys-*` properties, and the dice and roll results draw black text outlines;
-   every one of the 62 Vue components would need a look in both themes and both Styles.

Before any of that, a dark Genesys sheet needs a design: keep the paper light inside a dark frame, or darken the paper itself. The need came from an architecture review of what Foundry v13 and v14 offer, not from a user, so the work has no one yet to judge that design. The roadmap (#425) lists it as low priority, outside the 1.0.0 criteria.

## When to reconsider

This is deferred rather than refused: if a user asks for Genesys sheets that follow the dark theme, open an issue linking this file. The work would start by moving the hard-coded colors onto the Palette, which also helps worlds and modules that override it, then add a `.theme-dark` variant of each Style's Palette and drop the forced `theme-light`.

## Prior requests

-   #420: "Follow the user's dark interface theme on the Genesys sheets"
