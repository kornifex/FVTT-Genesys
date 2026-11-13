import type { SheetsContext } from './shared.ts';



export async function playerPermissionsPart(ctx: SheetsContext) {
	const { e2e, gm, player } = ctx;
	await e2e.step('#95 player opens a sheet they observe, one they see limited, and their own', () =>
		player.evaluate(async () => {
			for (const name of ['Observed', 'Limited', 'Hero']) await window.sheetsE2E.open(name);
		}),
	);
	e2e.expect(
		"#95 A11 a sheet the player can't edit has its fields disabled and its text areas read-only",
		await player.evaluate(() => ({
			Observed: window.sheetsE2E.editableFields('Observed'),
			Limited: window.sheetsE2E.editableFields('Limited'),
		})),
		await player.evaluate(() => {
			// The action buttons are counted apart: #574 R1 checks them.
			const counts = (name: string) => {
				const fields = window.sheetsE2E.editableFields(name);
				return { ...fields, enabled: 0, editableTextareas: 0 };
			};
			return { Observed: counts('Observed'), Limited: counts('Limited') };
		}),
	);
	e2e.expect(
		"#574 R1 a sheet the player can't edit keeps its action buttons enabled, and shows none that would edit it",
		await player.evaluate(() => {
			const actions = (name: string) => {
				const { actions, enabledActions, editActions } = window.sheetsE2E.editableFields(name);
				return { some: actions > 0, enabled: enabledActions === actions, editActions };
			};
			return { Observed: actions('Observed'), Limited: actions('Limited') };
		}),
		{ Observed: { some: true, enabled: true, editActions: 0 }, Limited: { some: true, enabled: true, editActions: 0 } },
	);
	e2e.expect(
		"#580 R1 a sheet the player can't edit shows its counters' values alone, with no spin button, − or +",
		await player.evaluate(() => {
			const { counters, ...controls } = window.sheetsE2E.counters('Observed');
			return { some: counters > 0, ...controls };
		}),
		{ some: true, spinButtons: 0, buttons: 0 },
	);
	// The observed character has the XP to raise its Brawn, which a user who may edit it does from the same label: a read
	// action an observer runs on the sheet.
	await e2e.step('#574 R2 player clicks the Brawn label of the sheet they observe', () =>
		player.evaluate(() => window.sheetsE2E.click('Observed', '.characteristics-row .characteristic-label button')),
	);
	e2e.expect(
		"#574 R2 on a sheet the player can't edit, a characteristic's label opens the Dice Prompt for its check, rather than raising it",
		await player.evaluate(() => ({ dicePrompts: window.sheetsE2E.prompts('app-dice-prompt').length })),
		{ dicePrompts: 1 },
	);
	await player.evaluate(() => window.sheetsE2E.closePrompts('app-dice-prompt'));
	e2e.expect(
		"#260 A5 the editor of a sheet the player can't edit has its toggle button disabled",
		await player.evaluate(() => window.sheetsE2E.editor('Observed', 'system.notes')),
		{ toggle: 'disabled', open: false, text: '', links: 0 },
	);
	await e2e.step('#95 player drops a weapon on the sheet they observe and on their own', () =>
		player.evaluate(async () => {
			await window.sheetsE2E.drop('Observed', { type: 'Item', name: 'weapon' });
			await window.sheetsE2E.drop('Hero', { type: 'Item', name: 'weapon' });
		}),
	);
	e2e.expect(
		"#95 A12 a drop on a sheet the player can't edit is ignored",
		await gm.evaluate(() => ({
			Observed: window.sheetsE2E.itemNames('Observed'),
			Hero: window.sheetsE2E.itemNames('Hero').includes('E2E weapon'),
		})),
		{ Observed: [], Hero: true },
	);
	await player.evaluate(() => window.sheetsE2E.closeAll());
}
