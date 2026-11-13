import type { DicePromptContext } from './shared.ts';

export async function repeatableEffectsPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, click, roll } = ctx;
	await gm.evaluate(async () => {
		const effect = (id: string, name: string, difficulty: number, changes: Record<string, boolean>) => ({
			id,
			name,
			description: '',
			difficulty,
			startsChecked: false,
			repeatable: false,
			qualities: [],
			critical: null,
			doublesDamageCharacteristic: false,
			...changes,
		});
		// An Easy spell with Range (+1), which can be added more than once and starts checked, and Additional Target (+2).
		const veil = {
			name: 'E2E Veil',
			type: 'spell',
			system: {
				action: 'custom',
				difficulty: 1,
				skills: ['Arcana'],
				additionalEffects: [
					effect('range', 'Range', 1, { repeatable: true, startsChecked: true }),
					effect('target', 'Additional Target', 2, {}),
				],
			},
		};
		await Actor.createDocuments([
			{
				name: 'E2E Illusionist',
				type: 'character',
				system: { characteristics: { intellect: 3 } },
				items: [{ name: 'Arcana', type: 'skill', system: { characteristic: 'intellect', rank: 2 } }, veil],
			},
		]);
	});
	const step = (name: string, direction: 1 | -1) =>
		gm.evaluate((args) => window.dicePromptE2E.promptStepEffect(args), { name, direction });
	const check = (name: string) => gm.evaluate((name) => window.dicePromptE2E.promptCheckEffect(name), name);
	const targetRow = (enabled: boolean) => ({
		name: 'Additional Target',
		adds: '+DD',
		checked: false,
		disabled: !enabled,
		why: enabled ? '' : 'Would take the difficulty beyond Formidable.',
	});

	await opened(gm, click(gm, { actor: 'Illusionist' }, '.tab-magic .spell .name button|E2E Veil'));
	e2e.expect(
		'#761 S1 Range, which can be added more than once and starts checked, opens at a count of 1 on an Average check, beside a checkbox for Additional Target',
		await gm.evaluate(() => window.dicePromptE2E.promptSpellEffects()),
		{
			effects: [{ name: 'Range', adds: '+D', count: 1, max: 4, canIncrease: true, why: '' }, targetRow(true)],
			difficulty: 'Difficulty: Average',
			pool: 'PPA|DD',
		},
	);

	await step('Range', 1);
	await step('Range', 1);
	const atFour = await step('Range', 1);
	e2e.expect(
		"#761 S2 Range raised to 4 takes the Easy spell to Formidable, and its count, like Additional Target, can't go further",
		{ effects: atFour.effects, difficulty: atFour.difficulty },
		{
			effects: [
				{ name: 'Range', adds: '+D', count: 4, max: 4, canIncrease: false, why: 'Would take the difficulty beyond Formidable.' },
				targetRow(false),
			],
			difficulty: 'Difficulty: Formidable',
		},
	);

	await step('Range', -1);
	const atTwo = await step('Range', -1);
	const withTarget = await check('Additional Target');
	e2e.expect(
		'#761 S3 Range lowered to 2 frees Additional Target, which, once checked, caps Range at 2 under Formidable',
		{ lowered: atTwo.difficulty, target: atTwo.effects[1], range: withTarget.effects[0], difficulty: withTarget.difficulty },
		{
			lowered: 'Difficulty: Hard',
			target: targetRow(true),
			range: { name: 'Range', adds: '+D', count: 2, max: 2, canIncrease: false, why: 'Would take the difficulty beyond Formidable.' },
			difficulty: 'Difficulty: Formidable',
		},
	);

	const freed = await check('Additional Target');
	e2e.expect(
		'#761 S4 unchecking Additional Target lets Range go up to 4 again',
		{ range: freed.effects[0], difficulty: freed.difficulty },
		{ range: { name: 'Range', adds: '+D', count: 2, max: 4, canIncrease: true, why: '' }, difficulty: 'Difficulty: Hard' },
	);

	await step('Range', 1);
	const cast = await step('Range', 1);
	await roll();
	const card = await gm.evaluate(() => window.dicePromptE2E.lastCard());
	e2e.expect(
		'#761 S5 the card of a Veil cast with Range 4 times, at Formidable, lists Range once, as « Range ×4 »',
		{ difficulty: cast.difficulty, effects: card.spellEffects },
		{ difficulty: 'Difficulty: Formidable', effects: ['Range ×4'] },
	);

	// #790: the Veil at Easy, raised to Hard by hand; Range added at Formidable adds nothing then, but counts once
	// Additional Target is taken off.
	await opened(gm, click(gm, { actor: 'Illusionist' }, '.tab-magic .spell .name button|E2E Veil'));
	await step('Range', -1);
	await gm.evaluate(() => window.dicePromptE2E.setPromptDifficulty([3]));
	await check('Additional Target');
	const rangeAtFormidable = (await step('Range', 1)).difficulty;
	const targetOff = (await check('Additional Target')).difficulty;
	await gm.evaluate(() => window.dicePromptE2E.setPromptDifficulty([6]));
	const impossibleRangeOff = (await step('Range', -1)).difficulty;
	await gm.evaluate(() => window.dicePromptE2E.closePrompts());
	e2e.expect(
		'#790 S1 an Easy Veil raised by hand to Hard, with Additional Target then Range added, is Daunting once Additional Target is taken off, and an Impossible one stays Impossible as Range is taken off',
		{ rangeAtFormidable, targetOff, impossibleRangeOff },
		{
			rangeAtFormidable: 'Difficulty: Formidable',
			targetOff: 'Difficulty: Daunting',
			impossibleRangeOff: 'Difficulty: Impossible',
		},
	);
	await e2e.step('repeatableEffects end');
}
