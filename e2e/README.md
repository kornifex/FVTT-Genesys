# Foundry e2e harness

Runs scenarios in real Foundry v12 and v13: each version is launched on a fresh copy of a world with a copy of a system build, a GM and a player join with headless Chromium (playwright-core), and each scenario's step log is printed, with its assertions. With `--compare`, the same scenarios run on another git ref's build too, and the steps that differ are listed.

It needs licensed Foundry installs, so it never runs in CI. It backs the "Testing a change" rule of [`docs/agents/code-style.md`](../docs/agents/code-style.md): a Foundry-dependent PR adds or extends its domain's scenario with `expect` steps, and `pnpm e2e:all` is the release gate of [`docs/agents/releasing.md`](../docs/agents/releasing.md).

## Setup

Licensed installs, data dirs and worlds stay outside the repo. Give them in `e2e/.env` (ignored by git), or in the environment, which wins:

```sh
# For each version: the Node binary it runs on, Foundry's main.js, a data dir holding Config/license.json and the world.
E2E_V12_NODE=/path/to/node20/bin/node
E2E_V12_FOUNDRY=/path/to/foundryvtt-12/resources/app/main.js
E2E_V12_DATA=/path/to/foundrydata-12
E2E_V12_WORLD=my-world
E2E_V13_NODE=/path/to/node22/bin/node
E2E_V13_FOUNDRY=/path/to/foundryvtt-13/main.js
E2E_V13_DATA=/path/to/foundrydata-13
E2E_V13_WORLD=my-world

# Optional
E2E_CHROMIUM=/path/to/chrome-headless-shell  # default: Playwright's download (pnpm exec playwright-core install chromium-headless-shell)
E2E_GM_USER=Gamemaster                       # a GM user without password
E2E_PLAYER_USER=Player                       # created by the GM when the world lacks it
E2E_PORT=30100
E2E_WORK_DIR=/tmp/genesys-e2e                # default: genesys-e2e in the system's temp dir
```

Node versions: Foundry v12 needs Node 20, v13 Node 22, v14 Node 24. Any version given as `E2E_V<n>_*` can run.

The harness only reads the data dirs: each run copies the licence and the world into `E2E_WORK_DIR/runs/`. The world needs a scene, or the first combat setup creates one.

## Running

```sh
pnpm e2e:all                                                     # the suite: every e2e/scenarios/*.ts, on v12 then v13
pnpm e2e e2e/scenarios/combat.ts                                 # builds the working tree, runs one scenario on v12 then v13
pnpm e2e e2e/scenarios/combat.ts --compare origin/main           # also on origin/main's build, then the differing steps
pnpm e2e path/to/scenario.ts --versions 12 --dist path/to/dist    # an existing build, v12 only
```

-   `pnpm e2e` takes scenario files and folders, a folder standing for its `.ts` files. Foundry is launched once per version and build: the scenarios run one after the other on the same world, each with newly joined clients and from its own setup. A scenario exporting `isolated = true` gets its own fresh world and launch, after the others.
-   `--compare <ref>` builds the ref once per commit, from `git archive`, in `E2E_WORK_DIR/builds/`. Compare against `origin/main`: a local `main` may lag behind.
-   Each step prints as `[v12 head] <step> <json>`, `[v12 head <scenario>] …` when several scenarios run, and a failed step starts with `FAILED`. The step logs are saved as JSON in `E2E_WORK_DIR/results/<scenario>/`, each launch's `server.log` in `E2E_WORK_DIR/runs/`.
-   The run ends with a summary per version and build: its assertion count, then each failed assertion with both values, and each scenario an error stopped (a `FATAL` step).
-   The exit code is 1 when an assertion failed on the working tree's build, or an error stopped a scenario on any build. An assertion failing on the build compared against doesn't count: it may lack the change under test.
-   Foundry v13 can't read the system's NeDB packs: it gets the LevelDB packs a v12 run migrated from the same build. Run v12 first, as the default `--versions 12,13` does; later runs reuse them.

## The suite

`e2e/scenarios/` holds one scenario per domain, each covering the items of the release's test checklist it can prove: `combat`, `dicePrompt`, `inventory`, `character`, `vehicle`, `adversaries`, `migrations` (isolated: it needs a pristine world) and `sheets`. A checklist item an `expect` step proves is ticked with a link to it: `e2e/scenarios/combat.ts › step "#59 A1 the turn stays on Hero:-1, with no turn event"`.

A Foundry-dependent change adds or extends its domain's scenario, rather than keeping a one-off scenario out of the repo. Every `.ts` file of `e2e/scenarios/` is a scenario: helpers shared by several scenarios go in `e2e/`, and those that run in the page in `window.e2e` ([`page.ts`](page.ts)).

## Writing a scenario

A scenario is a TypeScript file exporting `run`, and `isolated = true` when it must not share its world.

```ts
import type { ScenarioContext } from '../scenario.ts';

export async function run(e2e: ScenarioContext) {
	const player = await e2e.player();
	await e2e.setUpCombat({
		combatants: [
			{ name: 'Hero', type: 'character', owner: e2e.playerUser },
			{ name: 'Boss', type: 'rival', initiative: 2 },
		],
		turnOn: 'Boss:-1',
	});
	await e2e.step('before');
	const added = await e2e.step('#57 A1 GM adds an extra slot for Hero', () => e2e.gm.evaluate(() => window.e2e.addExtraSlotFor('Hero')));
	e2e.expect('#57 A1 the turn stays on Boss', added[e2e.playerUser]?.current, 'Boss:-1');
	await e2e.step('GM ends the turn', () => e2e.gm.evaluate(() => game.combat.nextTurn()));
	await player.reload();
	await e2e.step('player reloaded');
}
```

`ScenarioContext` ([`scenario.ts`](scenario.ts)):

-   `gm`, `player()`: clients joined as the GM and the player. `client.evaluate(fn, arg)` runs `fn` in the page; `client.reload()` reloads it as a client joining late; `client.page` is the Playwright page.
-   `client.leave()` closes the client's page, so that its user is no longer connected (a game with no GM online), and `client.join()` brings it back in a new page. Steps skip a client that left; evaluating in its page, or `setUpCombat` while the GM is away, stops the scenario with an error.
-   `client.fixDice(dice)` makes the next dice rolled in that page land on chosen faces, until the end of the step: `{ face: 3, faces: 8 }` is the third face of an Ability die, in the order of `src/dice/DieFaces.ts`. Fixing dice for another die type logs an error in the page, and a setup or a step's end makes the dice random again: fix them right before the roll. Fix dice only when a roll's result is under test: a scenario asserts a dice pool (the prompt's state, the Roll formula, the listed Pool Modifications) without needing its result.
-   `setUpCombat(setup)`: as the GM, deletes every combat and the previous setup's actors, then creates the combatants (actors and tokens named `E2E <name>`), their extra slots and the combat, starts it and puts the turn on a slot.
-   `step(name, action?)`: runs the action, waits 2.5 s for the updates to reach every client, then logs each connected client's combat state with the turn events, notifications and errors since the previous step, and returns the states by user name.
-   `expect(name, actual, expected)`: logs an assertion as a step holding both values. Deep equality, strict on types and missing keys: compare a plain object built in the page with `evaluate`. A failed assertion doesn't stop the scenario.
-   `log(name, value)`: logs anything else.
-   Step names are unique within a scenario: a comparison matches the steps of two runs by name, and a checklist item links its step by name.
-   `version`: the Foundry generation, for the rare step that differs.

A step that proves an item of the test checklist is named `#<section> <code> <description>`: `<section>` is the number of the checklist section that holds the item (`## #57 …`), and `<code>` a letter and a number, which an action and the `expect` steps checking it share, as `#57 A1` above. An item of several sections links the step from each, and the step takes the section of the part of the scenario it sits in. A step that proves no item, such as a setup, a teardown or a state dump, keeps a free label: `before`, `player reloaded`.

In the page, `window.e2e` ([`page.ts`](page.ts)) holds `combatState()`, `slotId(combatant, extraSlot)`, `name(text)` (combatant ids replaced by names), `addExtraSlotFor(combatant)`, `fixDice(dice)`, and the recorded `events` (`combatTurnChange`, `_onStartTurn`, `_onEndTurn`) and `notifications`. Slots are named `<combatant>:<extra slot index>`, `-1` for the combatant's own slot.

It also holds the helpers the scenarios' own page helpers share: `sleep`, `waitFor`, `text`, `unprefixed`, `isSetUp` and `deleteSetUp` for the documents named `E2E …`, `actor`, `token`, `target`, `htmlOf`, `apps` (the open applications of a CSS class), `drop`, `ensureScene`, `createCompendium`, `settings` and `setSettings`, `recordNotifications`, and the Dice Prompt's `poolPreview` and `poolModification`. A scenario installs its own helpers with `client.evaluate(install…)`, a function that takes the shared ones from `window.e2e`, installed before the scenario runs.

Scenarios in the suite share a world: each starts from its own setup (`setUpCombat`, or deleting what it created before, named `E2E …`), whatever the scenarios before it left.

Pitfalls:

-   Playwright sends the source of an evaluated function to the page: it can't use the scenario's variables. Pass them as the argument.
-   The Foundry globals are untyped in the harness ([`foundry.d.ts`](foundry.d.ts)), since one scenario runs on both versions.
-   On v13 the sidebar is collapsed in the headless window, so clicks on the combat tracker time out: call the method, or dispatch the event from `evaluate`.
