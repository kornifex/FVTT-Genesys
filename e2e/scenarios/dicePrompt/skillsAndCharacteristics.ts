import { unranked, type DicePromptContext } from './shared.ts';

const SIX_CHARACTERISTICS = ['brawn', 'agility', 'intellect', 'cunning', 'willpower', 'presence'];

export async function skillsAndCharacteristicsPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, select, toggle, setSetting, skillRoll, characteristicRoll, attack, rows } = ctx;
	const cool = await opened(gm, skillRoll('Cool'));
	e2e.expect('#49 A1 a character is offered its skills, then the Skills Compendium others as unranked', cool.skills, {
		'': ['—', 'Brawl (Br)', 'Cool (Pr)', 'Melee (Br)', 'Ranged (light) (Ag)'],
		Unranked: unranked(['Brawl', 'Cool', 'Melee', 'Ranged (Light)']),
	});

	// B: the characteristic menu (§#184, §#204, §#50).
	e2e.expect(
		'#184 B1 uncoupled skills off: a skill check is locked on its characteristic, without "—"',
		{ characteristic: cool.characteristic, skill: cool.skill, pool: cool.pool },
		{ characteristic: { value: 'presence', disabled: true, options: SIX_CHARACTERISTICS }, skill: 'Cool (Pr)', pool: 'A|DD' },
	);
	const willpowerCheck = await opened(gm, characteristicRoll(5));
	e2e.expect(
		'#184 B2 uncoupled skills off: a Characteristic Check opens the menu, with "—"',
		{
			characteristic: willpowerCheck.characteristic,
			skill: willpowerCheck.skill,
			pool: willpowerCheck.pool,
			rows: rows(willpowerCheck),
		},
		{
			characteristic: { value: 'willpower', disabled: false, options: ['-', ...SIX_CHARACTERISTICS] },
			skill: '—',
			pool: 'AAAA|DD',
			rows: [
				{ name: 'From Self: E2E Focus', enabled: false, mods: 'a+' },
				{ name: 'From Self: E2E Steady', enabled: false, mods: 'B+' },
			],
		},
	);
	await toggle('E2E Focus');
	await toggle('E2E Steady');
	const presenceCheck = await select('characteristic', 'presence');
	e2e.expect(
		'#50 B3 switching the characteristic lists its Pool Modifications, and keeps the state of those still listed',
		{ pool: presenceCheck.pool, rows: rows(presenceCheck) },
		{
			pool: 'a|DD',
			rows: [
				{ name: 'From Self: E2E Focus', enabled: true, mods: 'a+' },
				{ name: 'From Self: E2E Poise', enabled: false, mods: 'S+' },
			],
		},
	);
	const backToWillpower = await select('characteristic', 'willpower');
	e2e.expect(
		'#50 B4 switching back lists the first characteristic Pool Modification again, following auto-apply',
		{ pool: backToWillpower.pool, rows: rows(backToWillpower) },
		{
			pool: 'AAAAa|DD',
			rows: [
				{ name: 'From Self: E2E Focus', enabled: true, mods: 'a+' },
				{ name: 'From Self: E2E Steady', enabled: false, mods: 'B+' },
			],
		},
	);

	await setSetting('uncoupleSkills', true);
	const coolUncoupled = await opened(gm, skillRoll('Cool'));
	e2e.expect(
		'#184 B5 uncoupled skills on: a skill check offers the six characteristics, not "—", on its own',
		{ characteristic: coolUncoupled.characteristic, pool: coolUncoupled.pool, rows: rows(coolUncoupled).map(({ name }) => name) },
		{
			characteristic: { value: 'presence', disabled: false, options: SIX_CHARACTERISTICS },
			pool: 'A|DD',
			rows: ['From Self: E2E Focus', 'From Self: E2E Poise', 'From Self: E2E Nerve'],
		},
	);
	await toggle('E2E Nerve');
	const coolWillpower = await select('characteristic', 'willpower');
	e2e.expect(
		"#184 B6 uncoupled skills on: picking Willpower for Cool changes the pool and the characteristic's Pool Modifications",
		{
			characteristic: coolWillpower.characteristic?.value,
			skill: coolWillpower.skill,
			pool: coolWillpower.pool,
			rows: rows(coolWillpower),
		},
		{
			characteristic: 'willpower',
			skill: 'Cool (Pr)',
			pool: 'PAAAB|DD',
			rows: [
				{ name: 'From Self: E2E Focus', enabled: false, mods: 'a+' },
				{ name: 'From Self: E2E Steady', enabled: false, mods: 'B+' },
				{ name: 'From Self: E2E Nerve', enabled: true, mods: 'B+' },
			],
		},
	);
	const noSkill = await select('skill', '—');
	e2e.expect('#204 B7 uncoupled skills on: picking skill "—" offers "—" again, and picks it', noSkill.characteristic, {
		value: '-',
		disabled: false,
		options: ['-', ...SIX_CHARACTERISTICS],
	});
	const barePool = await select('characteristic', '-');
	e2e.expect(
		'#204 B8 "—" with no skill gives a bare pool',
		{ pool: barePool.pool, rows: rows(barePool) },
		{ pool: '|DD', rows: [{ name: 'From Self: E2E Focus', enabled: false, mods: 'a+' }] },
	);
	const attackUncoupled = await opened(gm, attack('Spear'));
	e2e.expect('#204 B9 uncoupled skills on: an attack offers the six characteristics, not "—"', attackUncoupled.characteristic, {
		value: 'brawn',
		disabled: false,
		options: SIX_CHARACTERISTICS,
	});
	await setSetting('uncoupleSkills', false);
	const gendr = await opened(gm, () => gm.evaluate(() => ui.chat.processMessage('/gendr')));
	e2e.expect(
		'#204 B10 /gendr opens a bare pool without characteristic and skill menus',
		{ actor: gendr.actor, pool: gendr.pool, characteristic: gendr.characteristic, skills: gendr.skills, rows: rows(gendr) },
		{ actor: null, pool: '|DD', characteristic: null, skills: null, rows: [] },
	);
}
