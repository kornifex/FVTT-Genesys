import {
	CLOSED_CHEVRON,
	CLOSED_DESCRIPTION,
	closedDescription,
	LONG_DESCRIPTION,
	OPEN_CHEVRON,
	shownDescription,
} from '../../descriptions.ts';
import type { OwnershipLevel } from '../../page.ts';
import type { ScenarioContext } from '../../scenario.ts';
import { dagger } from '../../weaponProfiles.ts';
import { type DescriptionRow, installCharacterHelpers, type Evaluate } from './shared.ts';

/**
 * §#393: the chevron after the name of a Combat tab row opens and closes its description, each Weapon Profile's row on
 * its own, on a sheet the user can't edit too; a row without a description shows none, and the name keeps its click.
 * §#579: the chevron of a second open sheet points at its own fold.
 */
export async function combatRowDescriptions(e2e: ScenarioContext, page: Evaluate) {
	const C = 'Duelist';
	const box = (row: DescriptionRow, cap: number) =>
		page((args) => window.characterE2E.descriptionBox(args.name, args.row, args.cap), { name: C, row, cap });
	const closed = (row: DescriptionRow) => closedDescription((cap) => box(row, cap));
	const chevron = (row: DescriptionRow) => page((args) => window.characterE2E.chevron(args.name, args.row), { name: C, row });
	const clickChevron = (row: DescriptionRow) => page((args) => window.characterE2E.clickChevron(args.name, args.row), { name: C, row });
	const clickName = (row: DescriptionRow) => page((args) => window.characterE2E.clickName(args.name, args.row), { name: C, row });
	const closeOpened = (item: string) => page((args) => window.characterE2E.closeOpened(args.name, args.item), { name: C, item });
	const MAIN = { weapon: 'Dagger' };
	const THROWN = { weapon: 'Dagger (Thrown)' };
	// The character owns every Skills Compendium skill, at rank 0: the Thrown profile attacks with Ranged, listed first.
	const weapon = dagger({ main: ['Melee', 'Brawl'], thrown: ['Ranged', 'Athletics'] });
	const rows = async () => ({
		main: await chevron(MAIN),
		thrown: await chevron(THROWN),
		armor: await chevron({ armor: 'Leather' }),
		injury: await chevron({ injury: 'Bruise' }),
	});

	await e2e.step(
		'#393 A1 a character given a described dagger with a Thrown profile, a club, a described armor and Critical Injury, and a Critical Injury without a description, its Combat tab shown',
		async () => {
			await page((name) => window.characterE2E.create(name), C);
			await page((args) => window.characterE2E.createItems(args.name, args.items), {
				name: C,
				items: [
					{ ...weapon, system: { ...weapon.system, description: LONG_DESCRIPTION } },
					{ name: 'E2E Club', type: 'weapon', system: { skills: ['Melee'], state: 'equipped' } },
					{ name: 'E2E Leather', type: 'armor', system: { state: 'equipped', description: '<p>Boiled leather.</p>' } },
					{ name: 'E2E Bruise', type: 'injury', system: { severity: 'easy', description: '<p>A dark bruise.</p>' } },
					// Foundry's editor saves a description cleared in it as an empty paragraph.
					{ name: 'E2E Scrape', type: 'injury', system: { severity: 'easy', description: '<p></p>' } },
				],
			});
			await page((name) => window.characterE2E.open(name), C);
			await page((name) => window.e2e.showTab(name, 'combat'), C);
		},
	);
	e2e.expect(
		'#393 A1 the rows of a weapon, of each of its Weapon Profiles, of an armor and of a Critical Injury show a chevron after their name, which tells their description is collapsed',
		await rows(),
		{ main: CLOSED_CHEVRON, thrown: CLOSED_CHEVRON, armor: CLOSED_CHEVRON, injury: CLOSED_CHEVRON },
	);
	e2e.expect(
		"#393 A1 the rows of a weapon and of a Critical Injury without a description show no chevron, and every row's description starts closed",
		{
			club: await chevron({ weapon: 'Club' }),
			scrape: await chevron({ injury: 'Scrape' }),
			main: await closed(MAIN),
			thrown: await closed(THROWN),
			armor: await closed({ armor: 'Leather' }),
			injury: await closed({ injury: 'Bruise' }),
		},
		{
			club: null,
			scrape: null,
			main: CLOSED_DESCRIPTION,
			thrown: CLOSED_DESCRIPTION,
			armor: CLOSED_DESCRIPTION,
			injury: CLOSED_DESCRIPTION,
		},
	);

	await e2e.step("#393 A2 the chevron of the dagger's main row clicked", () => clickChevron(MAIN));
	const opened = await closeOpened('Dagger');
	e2e.expect(
		"#393 A2 the main row's description shows the weapon's last line, at its full height past 200px",
		await box(MAIN, 200),
		shownDescription(200),
	);
	e2e.expect(
		"#393 A2 the main row's chevron points down, to hide the description, and the Thrown row's stays closed",
		{ main: await chevron(MAIN), thrown: await chevron(THROWN), thrownBox: await closed(THROWN) },
		{ main: OPEN_CHEVRON, thrown: CLOSED_CHEVRON, thrownBox: CLOSED_DESCRIPTION },
	);
	e2e.expect("#393 A2 the chevron opens neither the weapon's sheet nor the Dice Prompt", opened, { sheet: false, dicePrompt: false });

	await e2e.step("#393 A3 the chevron of the dagger's Thrown row clicked", () => clickChevron(THROWN));
	e2e.expect(
		"#393 A3 the Thrown row's description shows the weapon's last line too, at its full height past 200px",
		{ main: await box(MAIN, 200), thrown: await box(THROWN, 200) },
		{ main: shownDescription(200), thrown: shownDescription(200) },
	);

	await e2e.step("#393 A4 the chevron of the dagger's main row clicked again", () => clickChevron(MAIN));
	e2e.expect(
		"#393 A4 the main row's description closes, its chevron pointing right again, and the Thrown row's stays open",
		{
			main: await closed(MAIN),
			mainChevron: await chevron(MAIN),
			thrown: await box(THROWN, 200),
			thrownChevron: await chevron(THROWN),
		},
		{ main: CLOSED_DESCRIPTION, mainChevron: CLOSED_CHEVRON, thrown: shownDescription(200), thrownChevron: OPEN_CHEVRON },
	);

	await e2e.step('#393 A5 the sheet closed and opened again, on its Combat tab, with the Thrown row open', async () => {
		await page((name) => window.characterE2E.reopen(name), C);
		await page((name) => window.e2e.showTab(name, 'combat'), C);
	});
	e2e.expect(
		'#393 A5 every row opens closed again',
		{ rows: await rows(), thrown: await closed(THROWN) },
		{
			rows: { main: CLOSED_CHEVRON, thrown: CLOSED_CHEVRON, armor: CLOSED_CHEVRON, injury: CLOSED_CHEVRON },
			thrown: CLOSED_DESCRIPTION,
		},
	);

	// §#579: every Vue app numbers its ids from the same start, so that the folds of two open sheets shared their ids, and a
	// chevron's `aria-controls` pointed at the fold of the sheet opened first. Each sheet's ids now start with its own.
	const SECOND = 'Second';
	await e2e.step("#579 C1 a second character's sheet opened on its Combat tab, beside Duelist's", async () => {
		await page((name) => window.characterE2E.create(name), SECOND);
		await page((args) => window.characterE2E.createItems(args.name, args.items), {
			name: SECOND,
			items: [{ name: 'E2E Gambeson', type: 'armor', system: { state: 'equipped', description: '<p>Quilted.</p>' } }],
		});
		await page((name) => window.characterE2E.open(name), SECOND);
		await page((name) => window.e2e.showTab(name, 'combat'), SECOND);
	});
	e2e.expect(
		"#579 C1 the chevron of a row on the second sheet points at its own fold, not at a fold of Duelist's sheet",
		await page((args) => window.characterE2E.chevron(args.name, args.row), { name: SECOND, row: { armor: 'Gambeson' } }),
		CLOSED_CHEVRON,
	);
	await page((name) => window.characterE2E.close(name), SECOND);

	await e2e.step('#393 B1 the name of the armor clicked', () => clickName({ armor: 'Leather' }));
	e2e.expect(
		"#393 B1 the armor's name opens its sheet, and leaves its description closed",
		{ box: await closed({ armor: 'Leather' }), ...(await closeOpened('Leather')) },
		{ box: CLOSED_DESCRIPTION, sheet: true, dicePrompt: false },
	);

	await e2e.step('#393 B2 the name of the Critical Injury clicked', () => clickName({ injury: 'Bruise' }));
	e2e.expect(
		// §#578: the name heals the injury.
		"#393 B2 the Critical Injury's name opens the Dice Prompt of its healing check, and leaves its description closed",
		{ box: await closed({ injury: 'Bruise' }), ...(await closeOpened('Bruise')) },
		{ box: CLOSED_DESCRIPTION, sheet: false, dicePrompt: true },
	);

	let prompt: unknown;
	await e2e.step("#393 B3 the name of the dagger's Thrown row clicked", async () => {
		await clickName(THROWN);
		const { actor, skill } = await page(() => window.characterE2E.dicePrompt(), undefined);
		prompt = { actor, skill, box: await closed(THROWN) };
	});
	e2e.expect("#393 B3 the Thrown row's name opens the Dice Prompt of its attack, and leaves its description closed", prompt, {
		actor: 'E2E Duelist',
		skill: 'Ranged',
		box: CLOSED_DESCRIPTION,
	});
	await page((name) => window.characterE2E.close(name), C);

	// Reading a description edits nothing: a player who only observes the character opens it too.
	const player = await e2e.player();
	const playerPage = <A, R>(fn: (arg: A) => R | Promise<R>, arg: A) =>
		(player.evaluate as (fn: unknown, arg: unknown) => Promise<R>)(fn, arg);
	const setOwnership = (level: OwnershipLevel) =>
		page((args) => window.e2e.setOwnership(game.actors.getName(`E2E ${args.name}`), args.user, args.level), {
			name: C,
			user: e2e.playerUser,
			level,
		});
	// The player's level of its own on the character, by name, to give back afterwards.
	const previous = await page(
		(args): OwnershipLevel => {
			const level = game.actors.getName(`E2E ${args.name}`).ownership[game.users.getName(args.user).id];
			const named = Object.entries(CONST.DOCUMENT_OWNERSHIP_LEVELS).find(([, value]) => value === level)?.[0];
			return (named ?? 'INHERIT') as OwnershipLevel;
		},
		{ name: C, user: e2e.playerUser },
	);
	await e2e.step("#393 D1 the player given Observer on the character, its sheet's Combat tab shown in the player's page", async () => {
		await setOwnership('OBSERVER');
		await player.evaluate(installCharacterHelpers);
		await playerPage((name) => window.characterE2E.open(name), C);
		await playerPage((name) => window.e2e.showTab(name, 'combat'), C);
	});
	e2e.expect(
		"#393 D1 on a sheet the player can't edit, the weapon's row shows its chevron, pointing right",
		{
			editable: await playerPage((name) => game.actors.getName(`E2E ${name}`).sheet.isEditable, C),
			chevron: await playerPage((args) => window.characterE2E.chevron(args.name, args.row), { name: C, row: MAIN }),
		},
		{ editable: false, chevron: CLOSED_CHEVRON },
	);

	await e2e.step("#393 D2 the chevron of the dagger's main row clicked in the player's page", () =>
		playerPage((args) => window.characterE2E.clickChevron(args.name, args.row), { name: C, row: MAIN }),
	);
	e2e.expect(
		"#393 D2 the weapon's description opens on the sheet the player can't edit, at its full height past 200px, its chevron pointing down",
		{
			box: await playerPage((args) => window.characterE2E.descriptionBox(args.name, args.row, args.cap), {
				name: C,
				row: MAIN,
				cap: 200,
			}),
			chevron: await playerPage((args) => window.characterE2E.chevron(args.name, args.row), { name: C, row: MAIN }),
		},
		{ box: shownDescription(200), chevron: OPEN_CHEVRON },
	);

	// The player leaves as it came: the steps after these run without it.
	await playerPage((name) => window.characterE2E.close(name), C);
	await setOwnership(previous);
	await player.leave();
}
