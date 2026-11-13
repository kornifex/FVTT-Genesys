import type { ScenarioContext } from '../../scenario.ts';
import type { Evaluate } from './shared.ts';

/** §#36, §#49, §#137, §#431: an Archetype's drop and removal, and the items it granted. */
export async function archetypes(
	e2e: ScenarioContext,
	page: Evaluate,
	notified: (key: string, data?: Record<string, unknown>) => Promise<string>,
	notifications: () => Promise<string[]>,
) {
	const granted = (name: string) =>
		page(
			(name) => ({
				characteristics: Object.fromEntries(
					(['brawn', 'agility', 'intellect', 'cunning', 'willpower', 'presence'] as const).map((c) => [
						c,
						window.characterE2E.characteristic(name, c).base,
					]),
				),
				thresholds: window.characterE2E.thresholds(name),
				journal: window.characterE2E.journal(name),
				items: window.characterE2E.grants(name),
				athletics: window.characterE2E.skills(name, ['Athletics']).Athletics?.rank,
			}),
			name,
		);
	const all = (value: number) => ({ brawn: value, agility: value, intellect: value, cunning: value, willpower: value, presence: value });
	const dropArchetype = (actor: string) => page((actor) => window.characterE2E.applyArchetype(actor, 'Archetype'), actor);
	const removeArchetype = (actor: string) => page((actor) => window.characterE2E.removeArchetype(actor), actor);
	const handMade = [
		{ name: 'E2E Tough', type: 'ability', img: 'icons/svg/mystery-man.svg', system: { activation: { type: 'passive', detail: '' } } },
		{ name: 'E2E Tough', type: 'gear' },
	];

	await e2e.step('#36 A1 an Archetype dropped on a new character', async () => {
		await page((name) => window.characterE2E.create(name), 'Granted');
		await page((name) => window.characterE2E.open(name), 'Granted');
		await dropArchetype('Granted');
	});
	e2e.expect(
		'#36 A1 the Archetype gives its characteristics, thresholds, Starting XP and flagged items, and a rank of a granted skill named in another case',
		await granted('Granted'),
		{
			characteristics: all(2),
			thresholds: { wounds: 12, strain: 12 },
			journal: ['Starting 100'],
			items: ['ability:E2E Tough:own', 'archetype:E2E Archetype:none', 'talent:E2E Gifted:own'],
			athletics: 1,
		},
	);

	await e2e.step('#36 A2 the Archetype removed from the sheet', () => removeArchetype('Granted'));
	e2e.expect('#36 A2 removing the Archetype takes back everything it gave', await granted('Granted'), {
		characteristics: all(0),
		thresholds: { wounds: 0, strain: 0 },
		journal: [],
		items: [],
		athletics: 0,
	});

	await e2e.step('#137 A3 the Archetype dropped again, then an ability and a gear named like its ability added by hand', async () => {
		await dropArchetype('Granted');
		await e2e.settle();
		await page((items) => window.characterE2E.createItems('Granted', items), handMade);
	});
	e2e.expect(
		'#137 A3 the Talents tab lets the hand-added ability be deleted, not the granted one',
		await page((name) => window.characterE2E.abilityRows(name, 'E2E Tough'), 'Granted'),
		[
			{ handMade: false, canDelete: false },
			{ handMade: true, canDelete: true },
		],
	);
	await e2e.step('#137 A4 the Archetype removed', () => removeArchetype('Granted'));
	e2e.expect(
		'#137 A4 removing the Archetype deletes only the items it granted',
		await page((name) => window.characterE2E.grants(name), 'Granted'),
		['ability:E2E Tough:none', 'gear:E2E Tough:none'],
	);

	// A character that got its Archetype before #137: its granted items hold no flag.
	await e2e.step('#137 A5 an Archetype applied before #137, with a hand-added copy of its ability and a gear of that name', async () => {
		await page((name) => window.characterE2E.create(name), 'Legacy');
		await page((name) => window.characterE2E.open(name), 'Legacy');
		await dropArchetype('Legacy');
		await e2e.settle();
		await page(async () => {
			const legacy = game.actors.getName('E2E Legacy');
			for (const item of legacy.items.filter((item: { flags: { genesys?: object } }) => item.flags.genesys)) {
				await item.unsetFlag('genesys', 'archetypeGrant');
			}
		}, undefined);
		await page((items) => window.characterE2E.createItems('Legacy', items), handMade);
	});
	e2e.expect(
		'#137 A5 without flags, the Talents tab still protects one copy of the granted ability',
		await page((name) => window.characterE2E.abilityRows(name, 'E2E Tough'), 'Legacy'),
		[
			{ handMade: false, canDelete: false },
			{ handMade: true, canDelete: true },
		],
	);
	await e2e.step('#137 A6 the Archetype applied before #137 removed', () => removeArchetype('Legacy'));
	e2e.expect(
		'#137 A6 without flags, removing the Archetype deletes one copy of each granted item',
		await page((name) => window.characterE2E.grants(name), 'Legacy'),
		['ability:E2E Tough:none', 'gear:E2E Tough:none'],
	);

	await e2e.step('#137 A7 a granted ability renamed on the character', async () => {
		await page((name) => window.characterE2E.create(name), 'Renamed');
		await page((name) => window.characterE2E.open(name), 'Renamed');
		await dropArchetype('Renamed');
		await e2e.settle();
		await page(() => game.actors.getName('E2E Renamed').items.getName('E2E Tough').update({ name: 'E2E Hardy' }), undefined);
	});
	e2e.expect(
		'#137 A7 the renamed ability keeps the flag holding the character id',
		await page((name) => window.characterE2E.grants(name), 'Renamed'),
		['ability:E2E Hardy:own', 'archetype:E2E Archetype:none', 'talent:E2E Gifted:own'],
	);
	await e2e.step('#137 A8 the Archetype of the renamed ability removed', () => removeArchetype('Renamed'));
	e2e.expect(
		'#137 A8 removing the Archetype deletes the renamed ability',
		await page((name) => window.characterE2E.grants(name), 'Renamed'),
		[],
	);

	await e2e.step('#254 A9 an Archetype dropped over another, counting the writes', async () => {
		await page((name) => window.characterE2E.create(name), 'Swapper');
		await page((name) => window.characterE2E.open(name), 'Swapper');
		await dropArchetype('Swapper');
		await e2e.settle();
		await page((name) => window.characterE2E.startCounting(name), 'Swapper');
		await page((name) => window.characterE2E.applyArchetype(name, 'Small Archetype'), 'Swapper');
		await e2e.settle();
	});
	const swapWrites = await page(() => window.characterE2E.stopCounting(), undefined);
	e2e.log('#254 A9 sheet renders while replacing an Archetype', swapWrites.renders);
	e2e.expect('#254 A9 the new Archetype takes back what the old one gave, and gives its own', await granted('Swapper'), {
		characteristics: all(2),
		thresholds: { wounds: 12, strain: 12 },
		journal: ['Starting 30'],
		items: ['archetype:E2E Small Archetype:none'],
		athletics: 0,
	});
	e2e.expect(
		'#254 A9 replacing an Archetype updates the character once',
		{
			updateActor: swapWrites.updateActor,
			createItem: swapWrites.createItem,
			updateItem: swapWrites.updateItem,
			deleteItem: swapWrites.deleteItem,
		},
		{ updateActor: 1, createItem: 1, updateItem: 1, deleteItem: 3 },
	);

	await e2e.step('#431 A1 an Archetype dropped on a character whose XP Journal holds an XP Award', async () => {
		await page((name) => window.characterE2E.award(name, 10, 'E2E award'), 'Swapper');
		await e2e.settle();
		await notifications();
		await page((name) => window.characterE2E.drop(name, window.characterE2E.worldItem('Archetype')), 'Swapper');
	});
	e2e.expect(
		'#431 A1 the Archetype is refused with a notification that says to undo the entries past the Starting XP',
		{ character: await granted('Swapper'), notifications: await notifications() },
		{
			character: {
				characteristics: all(2),
				thresholds: { wounds: 12, strain: 12 },
				journal: ['Starting 30', 'Award 10 E2E award'],
				items: ['archetype:E2E Small Archetype:none'],
				athletics: 0,
			},
			notifications: [await notified('Genesys.Notifications.CannotReplaceArchetype', { name: 'E2E Archetype' })],
		},
	);

	await page(async () => {
		for (const name of ['Granted', 'Legacy', 'Renamed', 'Swapper']) await window.characterE2E.close(name);
	}, undefined);
}
