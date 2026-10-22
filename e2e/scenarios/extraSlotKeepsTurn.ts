/** @file #54: adding an Extra Slot keeps the turn on the slot whose turn it was, with no turn events. */
import type { ScenarioContext } from '../scenario.ts';

export async function run(e2e: ScenarioContext) {
	const combatants = (initiatives: { Hero?: number; Boss?: number } = {}) => [
		{ name: 'Hero', type: 'character' as const, owner: e2e.playerUser, initiative: initiatives.Hero },
		{ name: 'Boss', type: 'rival' as const, initiative: initiatives.Boss },
	];
	const player = await e2e.player();
	const addExtraSlotFor = (name: string) => () => e2e.gm.evaluate((name) => window.e2e.addExtraSlotFor(name), name);

	// No initiative rolled: every slot ties, so Hero's new slot sorts before Boss's, whose turn it is.
	await e2e.setUpCombat({ combatants: combatants(), turnOn: 'Boss:-1' });
	await e2e.step('A0 before');
	await e2e.step('A1 GM adds an extra slot for Hero', addExtraSlotFor('Hero'));
	await e2e.step('A2 GM adds an extra slot for Boss', addExtraSlotFor('Boss'));
	await e2e.step('A3 GM ends the turn', () => e2e.gm.evaluate(() => game.combat.nextTurn()));

	// Initiatives rolled, Boss ahead: Hero's new slot sorts after the current one.
	await e2e.setUpCombat({ combatants: combatants({ Hero: 1, Boss: 2 }), turnOn: 'Boss:-1' });
	await e2e.step('B0 before');
	await e2e.step('B1 GM adds an extra slot for Hero', addExtraSlotFor('Hero'));

	// Before the combat starts, there is no turn to keep.
	await e2e.setUpCombat({ combatants: combatants(), start: false });
	await e2e.step('C0 before');
	await e2e.step('C1 GM adds an extra slot for Hero', addExtraSlotFor('Hero'));
	await e2e.step('C2 GM starts the combat', () => e2e.gm.evaluate(() => game.combat.startCombat()));

	await player.reload();
	await e2e.step('C3 player reloaded');
}
