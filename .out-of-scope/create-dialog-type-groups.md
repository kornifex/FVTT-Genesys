# Grouping the types in the create dialog

The dialog that creates an actor or an item from the sidebar lists Foundry's types as one flat list, sorted by label. The system doesn't group them (Character Creation, Equipment and Other for items; Adversaries and Other for actors).

## Why this is out of scope

The groups came from a `renderDialog` hook that rebuilt the type select of Foundry v12's create dialog into `<optgroup>`s, keyed on classes the system's `createDialog` overrides added. From v13 on, the create dialog is a `DialogV2`: `renderDialog` never fires, and the overrides only broke the dialog's position and logged a compatibility warning (#262). They went with v12 (#290).

Foundry v13 and v14's `createDialog` have no notion of type groups: they build a flat, sorted list of `{ value, label }`. Bringing the groups back would need either:

-   a `renderDialogV2` hook that recognises the create dialog by its content and rewrites its select, as fragile as the v12 hook was;
-   or the system's own template passed through `createDialog`'s `template` and `context` options, on every directory and compendium create path, to keep in step with Foundry's template.

Both mean maintaining a copy of a Foundry dialog for a list of 5 actor types and 13 item types, which Foundry already sorts by label.

## When to reconsider

If Foundry's create dialog gains type groups, or if the number of types grows enough that a flat list hurts, open an issue linking this file.

## Prior requests

-   #262: "The create dialog loses its position and logs a compatibility warning on Foundry v13" (the groups were the open question left after #290)
