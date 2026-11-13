import { type Doc, unranked, type DicePromptContext } from './shared.ts';

export async function attackSkillsPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, noPrompt, click, select, update, attack, skiff, combatWeapons } = ctx;
	const inventoryWeapons = () => gm.evaluate(() => window.dicePromptE2E.inventoryWeapons('Ada'));
	const attackSkill = (doc: Doc) =>
		gm.evaluate((doc) => {
			const actor = game.actors.getName(`E2E ${'actor' in doc ? doc.actor : ''}`);
			return actor.items.getName(`E2E ${'item' in doc ? doc.item : ''}`).system.attackSkill;
		}, doc);
	e2e.expect(
		"#49 D1 the Combat tab shows each weapon's Attack Skill, a select for a weapon listing several",
		await combatWeapons('Ada'),
		[
			{ name: 'E2E Spear', link: true, skill: '[Melee]', choices: ['Brawl', 'Melee', 'Ranged'] },
			{ name: 'E2E Pistol', link: true, skill: 'Ranged (light)', choices: null },
			{ name: 'E2E Stick', link: false, skill: 'Skill Not Found', choices: null },
			{ name: 'E2E Blaster', link: true, skill: 'Piloting (Space)Skill Not Found', choices: null },
			{ name: 'E2E Club', link: true, skill: 'Melee', choices: null },
		],
	);
	e2e.expect(
		// §#641: a weapon attacks from the Combat tab alone.
		"#49 D2 the Inventory tab shows each weapon's Attack Skill, and offers no attack",
		await inventoryWeapons(),
		[
			{ name: 'E2E Spear', attack: false, skill: 'Melee' },
			{ name: 'E2E Pistol', attack: false, skill: 'Ranged (light)' },
			{ name: 'E2E Stick', attack: false, skill: '-' },
			{ name: 'E2E Blaster', attack: false, skill: 'Piloting (Space)' },
			{ name: 'E2E Club', attack: false, skill: 'Melee' },
		],
	);
	await gm.evaluate(() =>
		window.dicePromptE2E.change({
			doc: { actor: 'Ada' },
			path: '.tab-combat .weapon|E2E Spear >> select.attack-skill',
			value: 'Ranged',
		}),
	);
	e2e.expect(
		'#196 D3 choosing Ranged for the spear stores it, and both tabs show it',
		{
			stored: await attackSkill({ actor: 'Ada', item: 'Spear' }),
			combat: (await combatWeapons('Ada')).find(({ name }) => name === 'E2E Spear'),
			inventory: (await inventoryWeapons()).find(({ name }) => name === 'E2E Spear')?.skill,
		},
		{
			stored: 'Ranged',
			combat: { name: 'E2E Spear', link: true, skill: '[Ranged]', choices: ['Brawl', 'Melee', 'Ranged'] },
			inventory: 'Ranged',
		},
	);
	const spear = await opened(gm, attack('Spear'));
	e2e.expect(
		"#196 D4 the spear's attack opens on the chosen skill, the weapon's skills first in their group, owned or not",
		{ skill: spear.skill, pool: spear.pool, skills: spear.skills },
		{
			skill: 'Ranged (Ag)',
			pool: 'AA|DD',
			skills: {
				'': ['—', 'Cool (Pr)', 'Ranged (light) (Ag)'],
				'Weapon Skills': ['Brawl (Br)', 'Melee (Br)', 'Ranged (Ag)'],
				Unranked: unranked(['Brawl', 'Cool', 'Melee', 'Ranged', 'Ranged (Light)']),
			},
		},
	);
	const athletics = await select('skill', 'Athletics');
	await gm.evaluate(() => window.dicePromptE2E.closePrompts());
	e2e.expect(
		'#196 D5 picking another skill in the prompt applies to that roll only',
		{ skill: athletics.skill, pool: athletics.pool, stored: await attackSkill({ actor: 'Ada', item: 'Spear' }) },
		{ skill: 'Athletics (Br)', pool: 'AAA|DD', stored: 'Ranged' },
	);
	await update({ actor: 'Ada', item: 'Spear' }, { 'system.skills': ['Brawl', 'Melee'] });
	e2e.expect(
		'#196 D6 a choice the weapon no longer lists falls back to the listed skill owned at the highest rank',
		{
			combat: (await combatWeapons('Ada')).find(({ name }) => name === 'E2E Spear'),
			inventory: (await inventoryWeapons()).find(({ name }) => name === 'E2E Spear')?.skill,
			prompt: (await opened(gm, attack('Spear'))).skill,
		},
		{
			combat: { name: 'E2E Spear', link: true, skill: '[Melee]', choices: ['Brawl', 'Melee'] },
			inventory: 'Melee',
			prompt: 'Melee (Br)',
		},
	);
	e2e.expect(
		'#49 D7 a weapon without skill offers no attack link on the Combat tab and no Attack button in the inventory',
		{
			combat: (await combatWeapons('Ada')).find(({ name }) => name === 'E2E Stick'),
			inventory: (await inventoryWeapons()).find(({ name }) => name === 'E2E Stick'),
		},
		{
			combat: { name: 'E2E Stick', link: false, skill: 'Skill Not Found', choices: null },
			inventory: { name: 'E2E Stick', attack: false, skill: '-' },
		},
	);

	// An adversary's weapons.
	e2e.expect(
		'#49 D8 the adversary sheet shows a select for a weapon listing several skills',
		await gm.evaluate(() => window.dicePromptE2E.adversaryWeapons('Rival')),
		[
			{ text: 'E2E Knife ([Melee]Damage 3Critical 3Range Engaged)', choices: ['Melee', 'Ranged'] },
			{ text: 'E2E Twig (No skillDamage 3Critical 3Range Engaged)', choices: null },
		],
	);
	e2e.expect(
		"#196 D9 clicking the knife's select doesn't roll",
		await noPrompt(gm, click(gm, { actor: 'Rival' }, '.adversary-items .weapon|E2E Knife >> select.attack-skill')),
		{ prompts: 0, notifications: [] },
	);
	await gm.evaluate(() =>
		window.dicePromptE2E.change({
			doc: { actor: 'Rival' },
			path: '.adversary-items .weapon|E2E Knife >> select.attack-skill',
			value: 'Ranged',
		}),
	);
	const knife = await opened(gm, click(gm, { actor: 'Rival' }, '.adversary-items .weapon|E2E Knife >> .weapon-attack'));
	e2e.expect(
		"#196 D10 the rival's knife attacks with the chosen Ranged",
		{ stored: await attackSkill({ actor: 'Rival', item: 'Knife' }), actor: knife.actor, skill: knife.skill },
		{ stored: 'Ranged', actor: 'Rival', skill: 'Ranged (Ag)' },
	);
	// §#578: its name opens its sheet instead, which closes again.
	e2e.expect(
		"#49 D11 a rival's weapon without skill doesn't roll, and its menu has no check",
		{
			click: await noPrompt(gm, click(gm, { actor: 'Rival' }, '.adversary-items .weapon|E2E Twig >> .weapon-name')),
			sheet: await gm.evaluate(async () => {
				const sheet = window.e2e.actor('Rival').items.getName('E2E Twig').sheet;
				const opened = sheet.rendered;
				if (opened) await sheet.close();
				return opened;
			}),
			twig: await gm.evaluate(() =>
				window.dicePromptE2E.menu({ doc: { actor: 'Rival' }, path: '.adversary-items .weapon|E2E Twig' }),
			),
			knife: await gm.evaluate(() =>
				window.dicePromptE2E.menu({ doc: { actor: 'Rival' }, path: '.adversary-items .weapon|E2E Knife' }),
			),
		},
		{
			click: { prompts: 0, notifications: [] },
			sheet: true,
			// The knife's name attacks, so its menu has no check either since #638.
			twig: ['Send to chat', 'Edit', 'Delete'],
			knife: ['Send to chat', 'Edit', 'Delete'],
		},
	);

	// A vehicle's weapons and skills.
	e2e.expect(
		"#196 D12 a vehicle weapon's Combat tab row has no Attack Skill select",
		await gm.evaluate(() =>
			window.dicePromptE2E.texts({ doc: { actor: 'Skiff' }, selector: '.tab-combat .weapon:not(.columns) select' }),
		),
		[],
	);
	const cannon = await opened(gm, click(gm, skiff, '.tab-combat .weapon .name button|E2E Cannon'));
	e2e.expect(
		"#196 D13 a vehicle weapon's attack is rolled by its crew member, with no weapon group",
		{ actor: cannon.actor, skill: cannon.skill, groups: Object.keys(cannon.skills ?? {}) },
		{ actor: 'Ada', skill: 'Gunnery (Ag)', groups: ['', 'Unranked'] },
	);
	e2e.expect(
		"#49 D14 the vehicle's Skills tab by crew member shows the owned Ranged (light) at its rank",
		await gm.evaluate(() => window.dicePromptE2E.texts({ doc: { actor: 'Skiff' }, selector: '.tab-skills .member-skill' })),
		['Gunnery (Ag)0', 'Ranged (light) (Ag)2'],
	);
	const byMember = await opened(gm, click(gm, skiff, '.tab-skills .member-skill button.skill-name|Ranged'));
	await gm.evaluate(() =>
		window.dicePromptE2E.change({ doc: { actor: 'Skiff' }, path: '.tab-skills .grouping-mode select', value: 'skill' }),
	);
	const bySkillRows = await gm.evaluate(() =>
		window.dicePromptE2E.texts({ doc: { actor: 'Skiff' }, selector: '.tab-skills .skills-container section' }),
	);
	const bySkill = await opened(
		gm,
		click(gm, skiff, '.tab-skills .skills-container section|Ranged >> .skill-content-details >> .skill-name'),
	);
	e2e.expect(
		"#49 D15 the vehicle's Skills tab, in both groupings, rolls the owned Ranged (light) with its Pool Modification",
		{
			bySkill: bySkillRows,
			prompts: [byMember, bySkill].map((state) => ({
				actor: state.actor,
				skill: state.skill,
				pool: state.pool,
				rows: state.modifications.map(({ name }) => name),
			})),
		},
		{
			bySkill: ['GunneryCrew MemberRoleSkillE2E AdaGunner0', 'Ranged (Light)Crew MemberRoleSkillE2E AdaGunner2'],
			prompts: [
				{ actor: 'Ada', skill: 'Ranged (light) (Ag)', pool: 'PP|DD', rows: ['From Self: E2E Focus', 'From Self: E2E Sights'] },
				{ actor: 'Ada', skill: 'Ranged (light) (Ag)', pool: 'PP|DD', rows: ['From Self: E2E Focus', 'From Self: E2E Sights'] },
			],
		},
	);
	await gm.evaluate(() => window.dicePromptE2E.closeSheets());
	await e2e.step('D end');
}
