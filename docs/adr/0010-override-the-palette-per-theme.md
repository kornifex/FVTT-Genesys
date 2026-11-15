# Override the Palette per Theme, on the element that carries it

Since 0.3.0, worlds and modules restyle the system by overriding a `--genesys-<name>` property on `:root`, which the system declares with zero specificity (`:where(:root)`). Foundry's dark Theme (#838) needs a second value for the paper and the ink, while that contract keeps working. Foundry puts the Theme's class on `body` for the applications, on `#interface` and the sidebar for the interface, and on a sheet whose user picked a Theme for it: a light sheet can sit inside a dark `body`, and the reverse.

## Rule

-   The dark Theme only redefines the surface and text roles (`paper`, `paper-pattern`, `field`, `ink`, `text-blue`, `die-outline`…), on `:where(.theme-dark)`, and a Style's own on `:where([data-genesys-style=<style>] .theme-dark)`. The other colors, blue, gold and the dice among them, keep one value: a world overrides them on `:root`, and the dark Theme shows the override.
-   A world styles the dark Theme by overriding a role on `.theme-dark`, whose specificity outweighs the system's.
-   A role derived from another color (`text-blue` from `blue`) is written as a `color-mix()` in the dark Theme too, so that it follows that color in every Style and under an override on `:root`.
-   An element in the light Theme inside a dark one takes back the light value of each role, as the document root computed it: `:where(:root)` copies each role into a `--genesys-theme-light-<name>` property, which `:where(.theme-light)` restores. A world's override of a role on `:root`, such as its paper since 0.3.0, keeps applying to the light sheets. The `--genesys-theme-light-*` properties are the system's plumbing, not part of the Palette: a world overrides the role itself.
-   The dark rules come after the root's, and the light one after both, since all have zero specificity and an element may get the root's values, a dark ancestor's and its own class.

## Considered options

-   **Redeclare the light defaults on `.theme-light`.** Simpler, but the light sheets would lose a world's override of a role on `:root`, the contract since 0.3.0.
-   **Declare the dark Theme on `.theme-dark` with the Style's specificity.** A world's override on `:root` would no longer reach the dark sheets for any color.
-   **Apply the dark Theme only to elements the system marks.** It would keep the variant off Foundry's own dark elements, but a world would have to learn a Genesys class besides Foundry's.

## Consequences

-   Every surface follows the Theme of the element that holds it: the Combat Tracker the interface's, a chat message popped out the light Theme Foundry gives its window.
-   Foundry marks each chat log `theme-light` whatever the interface's Theme. The chat cards follow the interface all the same: the dark variant is declared again on the log of a dark sidebar tab and of the dark interface's notifications, after the light rule. Foundry's own controls in a card (buttons, links, inline rolls) keep its light Theme.
-   Foundry always makes its tooltip dark: the Genesys tooltip swaps that class for the Theme of what it describes.
-   Foundry's effect sheet, which already follows the Theme, gets the dark roles at once.
-   `theme.test.ts` checks the contrasts in the four pairs of Style and Theme.
