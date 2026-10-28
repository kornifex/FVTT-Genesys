# Keep Vue for sheets and prompts

Every actor sheet, item sheet, prompt and the story point tracker is a Vue component: about 50 single-file components, more lines than the rest of the TypeScript. They mount through the `VueSheet` mixin (`src/vue/VueSheet.ts`), and the actor and item sheets through `VueDocumentSheet` on top of it. Handlebars only renders chat cards, the combat tracker and the effect sheet, where Foundry's own templates are the starting point.

AppV1 is deprecated since v13 and goes away in v16. We kept Vue and moved the mixins onto ApplicationV2 (#71), on v12 and v13 alike, instead of rewriting the sheets in Handlebars: the components kept their state handling and tests, and only the mounting layer changed.

## Consequences

-   The components are styled for AppV1 windows. ApplicationV2's own styles override some of theirs (v12's sit outside a cascade layer and outweigh many component rules), so `src/vue/VueSheet.scss` restores AppV1's window content and text fields, and a component rule for a field may need a heavier selector (`reset.input`'s parameter).
-   New sheets and prompts are Vue components mounted through the mixin. New chat cards and core-sidebar overrides stay in Handlebars.
-   Vue, vue-tsc and `eslint-plugin-vue` stay in the toolchain.
