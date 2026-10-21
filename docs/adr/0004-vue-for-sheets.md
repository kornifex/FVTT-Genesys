# Keep Vue for sheets and prompts

Every actor sheet, item sheet, prompt and the story point tracker is a Vue component: about 50 single-file components, more lines than the rest of the TypeScript. They mount through the `VueSheet` mixin (`src/vue/VueSheet.ts`) on Foundry's AppV1 classes. Handlebars only renders chat cards, the combat tracker and the effect sheet, where Foundry's own templates are the starting point.

AppV1 is deprecated since v13 and goes away in v16. We keep Vue and move the mixin onto ApplicationV2 instead of rewriting the sheets in Handlebars: the components keep their state handling and tests, and only the mounting layer changes.

## Consequences

- The ApplicationV2 move is its own piece of work (#71), done before the table reaches v14.
- New sheets and prompts are Vue components mounted through the mixin. New chat cards and core-sidebar overrides stay in Handlebars.
- Vue, vue-tsc and `eslint-plugin-vue` stay in the toolchain.
