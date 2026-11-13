import type { Client } from '../../scenario.ts';
import type { SheetsContext } from './shared.ts';



export async function liveEditsPart(ctx: SheetsContext, actorTypes: string[], itemTypes: string[], assistantGM: () => Promise<Client>) {
	const { e2e, gm } = ctx;
	const assistant = await assistantGM();
	await gm.evaluate(
		async (names) => {
			await window.sheetsE2E.closeAll();
			for (const name of names) await window.sheetsE2E.open(name);
		},
		[...actorTypes, ...itemTypes],
	);
	const editedSheets = [...actorTypes, ...itemTypes].filter((name) => name !== 'Hero');
	const shownEdits = (names: string[]) => {
		const sheets = window.sheetsE2E;
		return {
			wounds: sheets.counterValue('Hero', 'Current Wounds'),
			sources: Object.fromEntries(names.map((name) => [name, sheets.fieldValue(name, 'system.source')])),
			heroTalent: sheets.rowText('Hero', '.tab-talents .talent', 'E2E Ranked', '.name button'),
			heroSword: sheets.rowText('Hero', '.tab-inventory .inventory-item', 'E2E Sword', '.quantity'),
			nemesisTalent: sheets.rowText('Nemesis', '.adversary-items .talent', 'E2E Ranked', '.item-label button'),
			vehicleCannon: sheets.rowText('Vehicle', '.tab-inventory .inventory-item', 'E2E Cannon', '.quantity'),
		};
	};
	const editsBefore = await gm.evaluate(shownEdits, editedSheets);
	const editAll = (edits: { wounds: number; source: string; rank: number; quantity: number; names: string[] }) =>
		assistant.evaluate(async ({ wounds, source, rank, quantity, names }) => {
			const sheets = window.sheetsE2E;
			await sheets.update('Hero', { 'system.wounds.value': wounds });
			for (const name of names) await sheets.update(name, { 'system.source': source });
			for (const name of ['Hero/Ranked', 'Nemesis/Ranked']) await sheets.update(name, { 'system.rank': rank });
			for (const name of ['Hero/Sword', 'Vehicle/Cannon']) await sheets.update(name, { 'system.quantity': quantity });
		}, edits);
	await e2e.step('#249 Assistant GM edits each actor and item, and items of a character, a nemesis and a vehicle', () =>
		editAll({ wounds: 3, source: 'E2E Source 249', rank: 3, quantity: 4, names: editedSheets }),
	);
	e2e.expect(
		"#249 A1 GM: each open actor and item sheet shows at once another client's edit of its document and of its items",
		await gm.evaluate(shownEdits, editedSheets),
		{
			wounds: '3',
			sources: Object.fromEntries(editedSheets.map((name) => [name, 'E2E Source 249'])),
			heroTalent: 'E2E Ranked 3',
			heroSword: '4',
			nemesisTalent: 'E2E Ranked 3',
			vehicleCannon: '4',
		},
	);
	await e2e.step('#249 Assistant GM puts the edits back', () =>
		editAll({ wounds: Number(editsBefore.wounds), source: '', rank: 2, quantity: 1, names: editedSheets }),
	);
	e2e.expect('#249 A2 GM: the open sheets show the edits put back', await gm.evaluate(shownEdits, editedSheets), editsBefore);

	// §#249 from the sheet: a field changed in a sheet shows elsewhere in it at once, the source of an adversary or an
	// item above its description, the passenger capacity of a vehicle on its Crew tab. The character, the vehicle's crew
	// and a weapon's row have steps of their own (character.ts, inventory.ts, #82 A2 below).
	const sourceSheets = [...actorTypes.filter((name) => !['Hero', 'Vehicle'].includes(name)), ...itemTypes];
	const shownFromSheets = (names: string[]) => {
		const sheets = window.sheetsE2E;
		return {
			sources: Object.fromEntries(
				names.map((name) => [
					name,
					sheets.shownText(
						name,
						game.items.getName(`E2E ${name}`) ? '.tab[data-tab="description"] .source' : '.description-area .source',
					),
				]),
			),
			capacity: sheets.shownText('Vehicle', '.tab-crew .capacity-section span:last-child'),
		};
	};
	const fromSheetsBefore = await gm.evaluate(shownFromSheets, sourceSheets);
	const editInSheets = (edits: { source: string; capacity: string; names: string[] }) =>
		gm.evaluate(async ({ source, capacity, names }) => {
			const sheets = window.sheetsE2E;
			for (const name of names) await sheets.changeField(name, 'input[name="system.source"]', source);
			await sheets.changeField('Vehicle', 'input[name="system.passengers.threshold"]', capacity);
		}, edits);
	await e2e.step("#249 GM changes the source of each adversary and item, and a vehicle's passenger capacity, in their sheets", () =>
		editInSheets({ source: 'E2E Sheet Source', capacity: '7', names: sourceSheets }),
	);
	e2e.expect(
		'#249 A3 GM: a field changed in an adversary, item or vehicle sheet shows elsewhere in the sheet at once',
		await gm.evaluate(shownFromSheets, sourceSheets),
		{
			sources: Object.fromEntries(sourceSheets.map((name) => [name, 'E2E Sheet Source'])),
			capacity: fromSheetsBefore.capacity.replace(/\/\d+$/, '/7'),
		},
	);
	await e2e.step('#249 GM puts the fields back in the sheets', () =>
		editInSheets({ source: '', capacity: fromSheetsBefore.capacity.split('/')[1], names: sourceSheets }),
	);
	e2e.expect('#249 A4 GM: the sheets show the fields put back', await gm.evaluate(shownFromSheets, sourceSheets), fromSheetsBefore);
	await gm.evaluate(() => window.sheetsE2E.closeAll());
}
