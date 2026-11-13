import type { ScenarioContext } from '../../scenario.ts';
import { type SkillTarget, installCharacterHelpers, type Evaluate } from './shared.ts';

/**
 * §#512: a skill's icon opens its sheet and its name rolls it, on a character's Skills tab and among a rival's and a
 * minion's skills, on a sheet the user can't edit too.
 */
export async function skillIcons(e2e: ScenarioContext, page: Evaluate) {
	// A character created with a skill gets none from the Skills Compendium.
	const SKILL = 'E2E Lore';
	const skill = { name: SKILL, type: 'skill', system: { category: 'knowledge', characteristic: 'intellect' } };
	const sheets: { name: string; type: string; tab: string; target: SkillTarget }[] = [
		{ name: 'Archivist', type: 'character', tab: 'skills', target: { skill: SKILL } },
		{ name: 'Sage', type: 'rival', tab: 'stats', target: { adversarySkill: SKILL } },
		{ name: 'Acolytes', type: 'minion', tab: 'stats', target: { adversarySkill: SKILL } },
	];
	const OPEN_SKILL = { tooltip: "Open the skill's sheet", cursor: 'pointer' };
	const bySheet = async <T>(action: (sheet: (typeof sheets)[number]) => Promise<T>) => {
		const results: Record<string, T> = {};
		for (const sheet of sheets) results[sheet.name] = await action(sheet);
		return results;
	};
	const eachSheet = (expected: unknown) => Object.fromEntries(sheets.map(({ name }) => [name, expected]));
	const clickSkill = (client: Evaluate, part: 'icon' | 'name') =>
		bySheet(({ name, target }) =>
			client((args) => window.characterE2E.clickSkill(args.name, args.target, args.part), { name, target, part }),
		);
	const skillIcon = (client: Evaluate) =>
		bySheet(({ name, target }) => client((args) => window.characterE2E.skillIcon(args.name, args.target), { name, target }));
	const hasEdit = (client: Evaluate) =>
		bySheet(async ({ name, target }) =>
			(await client((args) => window.characterE2E.menu(args.name, args.target), { name, target })).includes('Edit'),
		);
	const openSheets = (client: Evaluate) =>
		bySheet(async ({ name, tab }) => {
			await client((name) => window.characterE2E.open(name), name);
			await client((args) => window.e2e.showTab(args.name, args.tab), { name, tab });
		});
	const closeSheets = (client: Evaluate) => bySheet(({ name }) => client((name) => window.characterE2E.close(name), name));

	await e2e.step('#512 A1 a character, a rival and a minion given the skill Lore, their sheets open on its list', async () => {
		for (const { name, type } of sheets)
			await page((args) => window.characterE2E.create(args.name, args.type, [args.skill]), { name, type, skill });
		await openSheets(page);
	});
	e2e.expect(
		"#512 A1 the icon of a skill on the Skills tab and on a rival's and a minion's sheet shows a pointer, and its tooltip reads Open the skill's sheet",
		await skillIcon(page),
		eachSheet(OPEN_SKILL),
	);

	let opened: Record<string, unknown> = {};
	await e2e.step("#512 A2 the skill's icon clicked on each sheet", async () => {
		opened = await clickSkill(page, 'icon');
	});
	e2e.expect(
		"#512 A2 a skill's icon opens the skill's sheet, and not the Dice Prompt",
		opened,
		eachSheet({ clicked: true, sheet: true, dicePrompt: false }),
	);

	await e2e.step("#512 A3 the skill's name clicked on each sheet", async () => {
		opened = await clickSkill(page, 'name');
	});
	e2e.expect(
		"#512 A3 a skill's name still opens the Dice Prompt, and not the skill's sheet",
		opened,
		eachSheet({ clicked: true, sheet: false, dicePrompt: true }),
	);
	e2e.expect("#512 A4 a skill's context menu keeps its Edit entry", await hasEdit(page), eachSheet(true));
	await closeSheets(page);

	// Reading a skill's description edits nothing: a player who only observes the actors opens it too.
	const player = await e2e.player();
	if (!player.connected) await player.join();
	const playerPage = <A, R>(fn: (arg: A) => R | Promise<R>, arg: A) =>
		(player.evaluate as (fn: unknown, arg: unknown) => Promise<R>)(fn, arg);
	await e2e.step("#512 B1 the player given Observer on the three actors, their sheets open in the player's page", async () => {
		await page(
			async (args) => {
				for (const name of args.names) await window.e2e.setOwnership(window.e2e.actor(name), args.user, 'OBSERVER');
			},
			{ names: sheets.map(({ name }) => name), user: e2e.playerUser },
		);
		await player.evaluate(installCharacterHelpers);
		await openSheets(playerPage);
	});
	e2e.expect(
		"#512 B1 on sheets the player can't edit, a skill's icon shows a pointer and its tooltip",
		{
			editable: await bySheet(({ name }) => playerPage((name) => game.actors.getName(`E2E ${name}`).sheet.isEditable, name)),
			icons: await skillIcon(playerPage),
		},
		{ editable: eachSheet(false), icons: eachSheet(OPEN_SKILL) },
	);
	await e2e.step("#512 B2 the skill's icon clicked on each sheet in the player's page", async () => {
		opened = await clickSkill(playerPage, 'icon');
	});
	e2e.expect(
		"#512 B2 a skill's icon opens the skill's sheet on a sheet the player can't edit",
		opened,
		eachSheet({ clicked: true, sheet: true, dicePrompt: false }),
	);
	e2e.expect(
		"#512 B3 a skill's context menu keeps its Edit entry on a sheet the player can't edit",
		await hasEdit(playerPage),
		eachSheet(true),
	);
	// §#576: an adversary's skill menu checks the sheet's `editable`, as the character's does.
	e2e.expect(
		"#576 R1 on a sheet the player can't edit, a skill's menu offers Edit alone: no Free Rank, Career Skill mark or Delete",
		await bySheet(({ name, target }) => playerPage((args) => window.characterE2E.menu(args.name, args.target), { name, target })),
		eachSheet(['Edit']),
	);
	await e2e.step('#576 R2 the rival Sage given a Sword', () =>
		page(async (name) => {
			await game.actors
				.getName(`E2E ${name}`)
				.createEmbeddedDocuments('Item', [{ name: 'E2E Sword', type: 'weapon', system: { skills: ['Melee'] } }]);
		}, 'Sage'),
	);
	e2e.expect(
		"#576 R2 on a sheet the player can't edit, an adversary's weapon menu keeps the entries that read, without Delete",
		await playerPage((name) => window.characterE2E.menu(name, { adversaryWeapon: 'Sword' }), 'Sage'),
		// Send to chat and Edit, as every row's menu has them since #577; its name attacks, with no Perform Check (#638).
		['Send to chat', 'Edit'],
	);
	// §#574: the skill's name, a button Foundry disables with the rest of a read-only sheet's form, which the sheet enables.
	await e2e.step("#574 R3 the skill's name clicked on each sheet in the player's page", async () => {
		opened = await clickSkill(playerPage, 'name');
	});
	e2e.expect(
		"#574 R3 a skill's name still opens the Dice Prompt on a sheet the player can't edit",
		opened,
		eachSheet({ clicked: true, sheet: false, dicePrompt: true }),
	);

	// The player leaves as it came: the steps after these run without it.
	await closeSheets(playerPage);
	await player.leave();
}
