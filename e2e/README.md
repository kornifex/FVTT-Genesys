# Foundry e2e harness

Runs a scenario in real Foundry v12 and v13: each version is launched on a fresh copy of a world with a copy of a system build, a GM and a player join with headless Chromium (playwright-core), and the scenario's step log is printed. With `--compare`, the same scenario runs on another git ref's build too, and the steps that differ are listed.

It needs licensed Foundry installs, so it never runs in CI. It backs the "Testing a change" rule of [`docs/agents/code-style.md`](../docs/agents/code-style.md): a Foundry-dependent PR runs a scenario on both versions and puts the result in its Evidence.

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
pnpm e2e e2e/scenarios/rollKeepsTurn.ts                          # builds the working tree, runs v12 then v13
pnpm e2e e2e/scenarios/rollKeepsTurn.ts --compare origin/main    # also on origin/main's build, then the differing steps
pnpm e2e path/to/scenario.ts --versions 12 --dist path/to/dist    # an existing build, v12 only
```

- `--compare <ref>` builds the ref once per commit, from `git archive`, in `E2E_WORK_DIR/builds/`. Compare against `origin/main`: a local `main` may lag behind.
- Each step prints as `[v12 head] <step> <json>`. The step logs are saved as JSON in `E2E_WORK_DIR/results/<scenario>/`, each run's `server.log` in `E2E_WORK_DIR/runs/`.
- The exit code is 1 when a run failed (a `FATAL` step).
- Foundry v13 can't read the system's NeDB packs: it gets the LevelDB packs a v12 run migrated from the same build. Run v12 first, as the default `--versions 12,13` does; later runs reuse them.

## Writing a scenario

A scenario is a TypeScript file exporting `run`. It may live anywhere: a PR's own scenario usually stays out of the repo, and the ones worth rerunning go into `e2e/scenarios/`.

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
	await e2e.step('GM adds an extra slot for Hero', () => e2e.gm.evaluate(() => window.e2e.addExtraSlotFor('Hero')));
	await e2e.step('GM ends the turn', () => e2e.gm.evaluate(() => game.combat.nextTurn()));
	await player.reload();
	await e2e.step('player reloaded');
}
```

`ScenarioContext` ([`scenario.ts`](scenario.ts)):

- `gm`, `player()`: clients joined as the GM and the player. `client.evaluate(fn, arg)` runs `fn` in the page; `client.reload()` reloads it as a client joining late; `client.page` is the Playwright page.
- `setUpCombat(setup)`: as the GM, deletes every combat and the previous setup's actors, then creates the combatants (actors and tokens named `E2E <name>`), their extra slots and the combat, starts it and puts the turn on a slot.
- `step(name, action?)`: runs the action, waits 2.5 s for the updates to reach every client, then logs each client's combat state with the turn events, notifications and errors since the previous step.
- `log(name, value)`: logs anything else.
- Step names are unique within a run: a comparison matches the steps of two runs by name.
- `version`: the Foundry generation, for the rare step that differs.

In the page, `window.e2e` ([`page.ts`](page.ts)) holds `combatState()`, `slotId(combatant, extraSlot)`, `name(text)` (combatant ids replaced by names), `addExtraSlotFor(combatant)`, and the recorded `events` (`combatTurnChange`, `_onStartTurn`, `_onEndTurn`) and `notifications`. Slots are named `<combatant>:<extra slot index>`, `-1` for the combatant's own slot.

Pitfalls:

- Playwright sends the source of an evaluated function to the page: it can't use the scenario's variables. Pass them as the argument.
- The Foundry globals are untyped in the harness ([`foundry.d.ts`](foundry.d.ts)), since one scenario runs on both versions.
- On v13 the sidebar is collapsed in the headless window, so clicks on the combat tracker time out: call the method, or dispatch the event from `evaluate`.
