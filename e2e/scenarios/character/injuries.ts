import type { GlyphName } from '../../accessibility.ts';
import type { ScenarioContext } from '../../scenario.ts';
import type { Evaluate } from './shared.ts';

/** §#126: the severity cells of Critical Injuries and Critical Hits, and the check their names open (#578). */
export async function injuries(e2e: ScenarioContext, page: Evaluate) {
	const severities = ['-', 'easy', 'average', 'hard', 'daunting', 'formidable'];
	const injuries = severities.map((severity) => ({ name: `E2E ${severity}`, type: 'injury', system: { severity } }));
	const cells = { '-': '', easy: 'D', average: 'DD', hard: 'DDD', daunting: 'DDDD', formidable: 'DDDDD' };
	await e2e.step('#126 L1 a character and a vehicle with one Critical Injury or Hit of each severity', async () => {
		await page((name) => window.characterE2E.create(name), 'Wounded');
		await page((name) => window.characterE2E.create(name), 'Mechanic');
		await page((name) => window.characterE2E.create(name, 'vehicle'), 'Wreck');
		await page((items) => window.characterE2E.createItems('Wounded', items), injuries);
		await page((items) => window.characterE2E.createItems('Wreck', items), injuries);
		await page(
			() =>
				game.actors.getName('E2E Wreck').update({
					'system.roles': [
						{
							id: 'e2erepairs',
							name: 'Repairs',
							skills: ['Mechanics'],
							members: [game.actors.getName('E2E Wounded').uuid, game.actors.getName('E2E Mechanic').uuid],
						},
					],
				}),
			undefined,
		);
		await page((name) => window.characterE2E.open(name), 'Wounded');
		await page((name) => window.characterE2E.open(name), 'Wreck');
	});
	e2e.expect(
		'#126 L1 each Critical Injury shows a difficulty die per step of its severity',
		await page((name) => window.characterE2E.severities(name), 'Wounded'),
		cells,
	);
	e2e.expect(
		'#126 L1 each Critical Hit shows a difficulty die per step of its severity',
		await page((name) => window.characterE2E.severities(name), 'Wreck'),
		cells,
	);
	// §#582: in words, as an image's name to a screen reader and as its tooltip, on the Combat tab shown. §#578: the
	// severity is text, and the name rolls the healing check.
	const severityButtons = await page(async () => {
		await window.e2e.showTab('Wounded', 'combat');
		const root = window.e2e.htmlOf(window.e2e.actor('Wounded').sheet)!;
		const cells = [...root.querySelectorAll<HTMLElement>('.critical-injuries .injury:not(.columns) .severity')];
		for (const cell of cells) cell.querySelector<HTMLElement>(':scope > span')!.dataset.e2e = 'glyph-severity';
		return cells.filter((cell) => cell.querySelector('button')).length;
	}, undefined);
	e2e.expect("#578 D1 a Critical Injury's severity is text, in no button: it no longer rolls", severityButtons, 0);
	const byLength = (names: GlyphName[]) => names.sort((left, right) => left.text.length - right.text.length);
	e2e.expect(
		"#582 A8 a Critical Injury's severity reads as its difficulty dice in words, in its tooltip too, and none as nothing",
		byLength(await e2e.gm.glyphNames('[data-e2e="glyph-severity"]')).map(({ text, name, tooltip }) => [text, name, tooltip === name]),
		[
			['', null, true],
			['D', '1 Difficulty die', true],
			['DD', '2 Difficulty dice', true],
			['DDD', '3 Difficulty dice', true],
			['DDDD', '4 Difficulty dice', true],
			['DDDDD', '5 Difficulty dice', true],
		],
	);
	let prompt: unknown;
	await e2e.step('#126 L2 the Formidable Critical Injury clicked', async () => {
		await page(() => window.characterE2E.rollInjury('Wounded', 'formidable'), undefined);
		prompt = await page(() => window.characterE2E.dicePrompt(), undefined);
	});
	e2e.expect('#126 L2 a Formidable Critical Injury opens the healing check with five difficulty dice', prompt, {
		actor: 'E2E Wounded',
		skill: 'Resilience',
		difficulty: 'DDDDD',
		difficultyDice: 5,
	});
	let members: string[] = [];
	await e2e.step('#126 L3 the Formidable Critical Hit clicked, and the repairer chosen', async () => {
		await page(() => window.characterE2E.rollInjury('Wreck', 'formidable'), undefined);
		members = await page(() => window.characterE2E.crewPrompt('Mechanic'), undefined);
		prompt = await page(() => window.characterE2E.dicePrompt(), undefined);
	});
	e2e.expect('#126 L3 the repairer is chosen among the crew', members, ['E2E Wounded', 'E2E Mechanic']);
	e2e.expect('#126 L3 a Formidable Critical Hit opens the repair check with five difficulty dice', prompt, {
		actor: 'E2E Mechanic',
		skill: 'Mechanics',
		difficulty: 'DDDDD',
		difficultyDice: 5,
	});
	await page(async () => {
		await window.characterE2E.close('Wounded');
		await window.characterE2E.close('Wreck');
	}, undefined);
}
