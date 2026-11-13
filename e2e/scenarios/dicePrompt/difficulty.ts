import type { PromptDifficulty, DicePromptContext } from './shared.ts';



export async function difficultyPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, click, toggle, roll, setSetting, control, ada, characteristicRoll, journal, linkPrompt } = ctx;
	await setSetting('defaultDifficulty', 'DDD');
	const difficultyState = () => gm.evaluate(() => window.dicePromptE2E.promptDifficulty());
	const setDifficulty = (dice: number[]) => gm.evaluate((dice) => window.dicePromptE2E.setPromptDifficulty(dice), dice);
	const shadowedCheck = () => opened(gm, characteristicRoll(1, { actor: 'Shadowed' }));
	const difficultyOf = (level: string, dice: string, manualChanges = '') => ({ label: `Difficulty: ${level}`, dice, manualChanges });
	const shown = ({ label, dice, manualChanges }: PromptDifficulty) => ({ label, dice, manualChanges });
	const opening = await shadowedCheck();
	const openingDifficulty = await difficultyState();
	e2e.expect(
		"#469 P1 the prompt opens with the Default Difficulty's dice lit among five, the level named in the row's label, without an Upgrades row",
		{ pool: opening.pool, rows: openingDifficulty.rows, hint: openingDifficulty.hint, difficulty: shown(openingDifficulty) },
		{
			pool: 'AA|DDD',
			rows: ['Difficulty: Hard', 'Manual Changes'],
			hint: 'Use the dice box on the right to add, upgrade and downgrade. Click a die in the pool to remove one of its kind, after every other change.',
			difficulty: difficultyOf('Hard', 'DDD··'),
		},
	);
	e2e.expect(
		"#496 P9 the Manual Changes row comes after the effects' rows, empty, the Difficulty row first",
		await gm.evaluate(() => window.dicePromptE2E.promptRows()),
		['Difficulty: Hard', 'From Self: E2E Shroud', 'Manual Changes'],
	);
	const easy = await setDifficulty([1]);
	const easyUpgraded = await toggle('E2E Shroud');
	e2e.expect(
		'#450 P2 an Easy check whose difficulty an effect upgrades twice rolls a Challenge die and a Difficulty die',
		{ easy: easy.pool, upgraded: easyUpgraded.pool, difficulty: shown(await difficultyState()) },
		{ easy: 'AA|D', upgraded: 'AA|CD', difficulty: difficultyOf('Easy', 'D····') },
	);
	await shadowedCheck();
	await gm.evaluate(() => window.dicePromptE2E.promptRemove('D'));
	const removed = await gm.evaluate(() => window.dicePromptE2E.promptRemove('D'));
	const removedUpgraded = await toggle('E2E Shroud');
	e2e.expect(
		'#450 P3 two Difficulty dice removed by hand from a Hard check come after the upgrades, as the CRB orders (p. 21)',
		{ removed: removed.pool, upgraded: removedUpgraded.pool, difficulty: shown(await difficultyState()) },
		{ removed: 'AA|D', upgraded: 'AA|CC', difficulty: difficultyOf('Hard', 'DDD··', 'D- D-') },
	);
	await shadowedCheck();
	const clicks = {
		formidable: await setDifficulty([5]),
		average: await setDifficulty([2]),
		lowered: await setDifficulty([2]),
		simple: await setDifficulty([1]),
		daunting: await setDifficulty([4]),
	};
	e2e.expect(
		'#469 P4 a click on a die lights it and those before it, a click on the highest lit die lowers the level by one, down to Simple',
		Object.fromEntries(
			Object.entries(clicks).map(([name, { pool, difficulty }]) => [name, { pool, difficulty: shown(difficulty) }]),
		),
		{
			formidable: { pool: 'AA|DDDDD', difficulty: difficultyOf('Formidable', 'DDDDD') },
			average: { pool: 'AA|DD', difficulty: difficultyOf('Average', 'DD···') },
			lowered: { pool: 'AA|D', difficulty: difficultyOf('Easy', 'D····') },
			simple: { pool: 'AA|', difficulty: difficultyOf('Simple', '·····') },
			daunting: { pool: 'AA|DDDD', difficulty: difficultyOf('Daunting', 'DDDD·') },
		},
	);
	await shadowedCheck();
	await setDifficulty([1]);
	await toggle('E2E Shroud');
	const rolled = await roll();
	e2e.expect('#450 P5 the check rolls the pool of the Difficulty set', rolled.formula, '0dp + 2da + 1di + 1dc');
	await setSetting('defaultDifficulty', 'DDB');
	const withBoost = await shadowedCheck();
	const withBoostDifficulty = shown(await difficultyState());
	const boostRemoved = await gm.evaluate(() => window.dicePromptE2E.removePromptManualChange(0));
	e2e.expect(
		'#450 P6 a Default Difficulty holding a Boost die opens with its Difficulty dice as the level and the Boost die as a manual change',
		{
			pool: withBoost.pool,
			difficulty: withBoostDifficulty,
			removed: { pool: boostRemoved.pool, difficulty: shown(boostRemoved.difficulty) },
		},
		{
			pool: 'AAB|DD',
			difficulty: difficultyOf('Average', 'DD···', 'B+'),
			removed: { pool: 'AA|DD', difficulty: difficultyOf('Average', 'DD···') },
		},
	);
	await setSetting('defaultDifficulty', 'DDD');
	await opened(gm, click(gm, ada, '.tab-combat .injury .name .roll-link'));
	const injury = shown(await difficultyState());
	await control(gm, ['Bo']);
	await linkPrompt(gm, journal, 'Athletics', 'CDD');
	const upgradedLink = shown(await difficultyState());
	const upgradedLinkClicks = { easy: await setDifficulty([1]), daunting: await setDifficulty([4]) };
	const impossible = await linkPrompt(gm, journal, 'Athletics', 'CCCCCD');
	const impossibleDifficulty = shown(await difficultyState());
	await control(gm, []);
	e2e.expect(
		"#450 P7 an injury's and a check link's difficulty set the level and the upgrades, a difficulty above Formidable is an Impossible one, of a Formidable one's dice (§#671)",
		{ injury, upgradedLink, impossible: { pool: impossible.pool, difficulty: impossibleDifficulty } },
		{
			injury: difficultyOf('Average', 'DD···'),
			upgradedLink: difficultyOf('Hard', 'CDD··'),
			impossible: { pool: '|CCCCC', difficulty: difficultyOf('Impossible', 'CCCCC') },
		},
	);
	e2e.expect(
		"#469 P8 a check link's upgrade stays a Challenge die, first among the five, as a click changes the level",
		Object.fromEntries(
			Object.entries(upgradedLinkClicks).map(([name, { pool, difficulty }]) => [name, { pool, difficulty: shown(difficulty) }]),
		),
		{
			easy: { pool: '|C', difficulty: difficultyOf('Easy', 'C····') },
			daunting: { pool: '|CDDD', difficulty: difficultyOf('Daunting', 'CDDD·') },
		},
	);
	await setSetting('defaultDifficulty', 'DD');
	await gm.evaluate(() => window.dicePromptE2E.closePrompts());
	await gm.evaluate(() => window.dicePromptE2E.closeSheets());
	await e2e.step('P end');
}
