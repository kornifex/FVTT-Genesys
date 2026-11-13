import type { Client } from '../../scenario.ts';
import { installCriticalInjuryHelpers, type DicePromptContext } from './shared.ts';



export async function criticalInjuriesPart(ctx: DicePromptContext) {
	const { e2e, gm, player, opened, roll, update, target, attack } = ctx;
	for (const client of [gm, player]) await client.evaluate(installCriticalInjuryHelpers);
	const previous = await gm.evaluate(() => window.criticalInjuryE2E.setUp());
	const fromSheet = (client: Client, actor: string) =>
		client.evaluate((actor) => window.criticalInjuryE2E.openFromSheet(actor), actor);
	const type = (client: Client, name: string, value: string) =>
		client.evaluate((args) => window.criticalInjuryE2E.type(args), { name, value });
	const rollCritical = async (client: Client, d100: number) => {
		await client.fixDice([{ face: d100, faces: 100 }]);
		return client.evaluate(() => window.criticalInjuryE2E.roll());
	};
	// A talent of rank 2 whose effect changes Critical Injury rolls, scaled by its rank or not. Mode 0 is Foundry's custom
	// mode, which v14 reads as the custom type.
	const talent = (name: string, key: string, value: string, scalesWithRank: 'yes' | 'no') => ({
		name: `E2E ${name}`,
		type: 'talent',
		system: { ranked: 'yes', rank: 2, scalesWithRank },
		effects: [{ name: `E2E ${name}`, changes: [{ key, value, mode: 0 }] }],
	});
	// The attacker's talent adds 10 per rank to the injuries it inflicts; the target already has an injury, and a talent
	// that takes 10 off those it suffers, whatever its rank.
	await gm.evaluate(
		async ({ inflicted, suffered }) => {
			await window.e2e.actor('Ada').createEmbeddedDocuments('Item', [inflicted]);
			await window.e2e
				.actor('Rival')
				.createEmbeddedDocuments('Item', [suffered, { name: 'E2E Wound', type: 'injury', system: { severity: 'easy' } }]);
			await window.e2e.settle();
		},
		{
			inflicted: talent('Lethal', 'genesys.critical.inflicted', '10', 'yes'),
			suffered: talent('Durable', 'genesys.critical.suffered', '-10', 'no'),
		},
	);
	await update(
		{ actor: 'Ada', item: 'Pistol' },
		{ 'system.critical': 1, 'system.qualities': [{ name: 'Vicious', description: '', isRated: true, rating: 2 }] },
	);
	await target('Rival');

	await opened(gm, attack('Pistol'));
	// Proficiency faces: 12 is a Triumph, 10 two Advantages; Difficulty face 1 is blank.
	await gm.fixDice([
		{ face: 12, faces: 12 },
		{ face: 10, faces: 12 },
		{ face: 1, faces: 8 },
		{ face: 1, faces: 8 },
	]);
	const attackMessage = await roll();
	const card = await gm.evaluate(() => window.criticalInjuryE2E.attackCard());
	e2e.expect(
		'#685 C1 an attack whose Advantage reaches its Critical rating twice, with a Triumph, triggers three Critical Injuries, which its card offers to roll',
		{ results: attackMessage.results, card },
		{ results: 'a a t', card: { triggers: 'Critical Injury Triggers 3', button: true } },
	);

	const fromCard = await gm.evaluate(() => window.criticalInjuryE2E.openFromCard());
	e2e.expect(
		"#685 C2 the card's dialog rolls for the target: one trigger spent, the weapon's Vicious, the attacker's talent by rank, the target's injury and talent",
		fromCard,
		{
			header: ['Critical Injury for E2E Rival', 'Attack: E2E Pistol', 'Table: E2E Crits'],
			spent: { value: '1', max: '3' },
			lines: [
				'Extra triggers (+10 each past the first): 0',
				'Vicious 2: 20',
				'E2E Lethal (attacker): 20',
				'Critical Injuries already suffered (1): 10',
				'E2E Durable: -10',
				'Free modifier: 0',
			],
			formula: '1d100 + 40',
		},
	);
	const spentAll = await type(gm, 'spent', '3');
	const attackRolled = await rollCritical(gm, 25);
	e2e.expect(
		'#685 C3 spending every trigger adds 10 for each past the first, and the roll draws from the table, its message linking the item',
		{ spent: { lines: spentAll.lines[0], formula: spentAll.formula }, rolled: attackRolled },
		{
			spent: { lines: 'Extra triggers (+10 each past the first): 20', formula: '1d100 + 60' },
			rolled: {
				speaker: 'E2E Ada',
				flavor: 'Critical Injury: E2E Rival',
				formula: '1d100 + 60',
				total: 85,
				results: ['E2E Scar'],
				links: ['E2E Scar'],
			},
		},
	);

	await target(null);
	const fromAda = await fromSheet(gm, 'Ada');
	const adaRolled = await rollCritical(gm, 25);
	e2e.expect(
		"#685 C4 a character's sheet rolls without an attack, with the character's injury: the same d100 draws a lower result",
		{ dialog: fromAda, rolled: adaRolled },
		{
			dialog: {
				header: ['Critical Injury for E2E Ada', 'Table: E2E Crits'],
				spent: null,
				lines: ['Critical Injuries already suffered (1): 10', 'Free modifier: 0'],
				formula: '1d100 + 10',
			},
			rolled: {
				speaker: 'E2E Ada',
				flavor: 'Critical Injury: E2E Ada',
				formula: '1d100 + 10',
				total: 35,
				results: ['E2E Nick'],
				links: ['E2E Nick'],
			},
		},
	);

	await fromSheet(gm, 'Ada');
	await type(gm, 'line-injuries', '0');
	const edited = await type(gm, 'line-free', '80');
	const editedRolled = await rollCritical(gm, 25);
	e2e.expect(
		'#685 C5 every line stays editable: an injury left out and a free modifier move the result',
		{ lines: edited.lines, formula: edited.formula, total: editedRolled.total, results: editedRolled.results },
		{
			lines: ['Critical Injuries already suffered (1): 0', 'Free modifier: 80'],
			formula: '1d100 + 80',
			total: 105,
			results: ['E2E Maim'],
		},
	);

	const fromRival = await fromSheet(gm, 'Rival');
	await gm.evaluate(() => window.criticalInjuryE2E.closePrompts());
	e2e.expect("#685 C6 an adversary's sheet rolls with its injuries and its own talent", fromRival, {
		header: ['Critical Injury for E2E Rival', 'Table: E2E Crits'],
		spent: null,
		lines: ['Critical Injuries already suffered (1): 10', 'E2E Durable: -10', 'Free modifier: 0'],
		formula: '1d100',
	});

	const fromBo = await fromSheet(player, 'Bo');
	const boRolled = await rollCritical(player, 60);
	e2e.expect(
		"#685 C7 a player rolls from their character's sheet, on a table the GM hasn't shared with them",
		{ formula: fromBo.formula, rolled: boRolled },
		{
			formula: '1d100',
			rolled: {
				speaker: 'E2E Bo',
				flavor: 'Critical Injury: E2E Bo',
				formula: '1d100',
				total: 60,
				results: ['E2E Scar'],
				links: ['E2E Scar'],
			},
		},
	);

	// Rival is targeted as the prompt opens, then Bo before the roll: the card keeps the Critical Injury against Rival.
	await target('Rival');
	await opened(gm, attack('Pistol'));
	await target('Bo');
	await gm.fixDice([
		{ face: 12, faces: 12 },
		{ face: 10, faces: 12 },
		{ face: 1, faces: 8 },
		{ face: 1, faces: 8 },
	]);
	await roll();
	const retargeted = await gm.evaluate(() => {
		const message = game.messages.contents.at(-1);
		return {
			target: fromUuidSync(message.flags.genesys.criticalInjury.target)?.name,
			button: message.content.includes('roll-critical-injury'),
		};
	});
	await target(null);
	e2e.expect(
		'#730 C8 an attack rolled against another target than the one the prompt opened with keeps its Critical Injury against the first',
		retargeted,
		{ target: 'E2E Rival', button: true },
	);

	// The Pistol gets Brutal 2, a quality whose effect adds 10 to the injuries its attacks inflict; the Revolver, which
	// attacks with the same skill, has none (§#726).
	await gm.evaluate(async () => {
		const ada = window.e2e.actor('Ada');
		const pistol = ada.items.getName('E2E Pistol');
		await pistol.update({
			'system.qualities': [
				...pistol.system.qualities,
				{ id: 'e2eBrutal', name: 'E2E Brutal', description: '', isRated: true, rating: 2 },
			],
		});
		await pistol.createEmbeddedDocuments('ActiveEffect', [
			{
				name: 'E2E Brutal',
				flags: { genesys: { quality: 'e2eBrutal' } },
				changes: [{ key: 'genesys.critical.inflicted', value: '10', mode: 0 }],
			},
		]);
		await ada.createEmbeddedDocuments('Item', [
			{
				name: 'E2E Revolver',
				type: 'weapon',
				system: { skills: ['Ranged (Light)'], range: 'medium', state: 'equipped', critical: 1 },
			},
		]);
		await window.e2e.settle();
	});
	const criticalFromAttack = async (weapon: string) => {
		await target('Rival');
		await opened(gm, attack(weapon));
		await gm.fixDice([
			{ face: 12, faces: 12 },
			{ face: 10, faces: 12 },
			{ face: 1, faces: 8 },
			{ face: 1, faces: 8 },
		]);
		await roll();
		const dialog = await gm.evaluate(() => window.criticalInjuryE2E.openFromCard());
		await gm.evaluate(() => window.criticalInjuryE2E.closePrompts());
		return dialog.lines;
	};
	e2e.expect(
		"#726 C8 an attack with a weapon carrying Brutal 2 lists the quality's +10 per rank in the Critical Injury dialog",
		await criticalFromAttack('Pistol'),
		[
			'Extra triggers (+10 each past the first): 0',
			'Vicious 2: 20',
			'E2E Brutal (E2E Pistol) (attacker): 20',
			'E2E Lethal (attacker): 20',
			'Critical Injuries already suffered (1): 10',
			'E2E Durable: -10',
			'Free modifier: 0',
		],
	);
	e2e.expect(
		"#726 C9 an attack with another weapon of the same attacker doesn't list the quality",
		await criticalFromAttack('Revolver'),
		[
			'Extra triggers (+10 each past the first): 0',
			'E2E Lethal (attacker): 20',
			'Critical Injuries already suffered (1): 10',
			'E2E Durable: -10',
			'Free modifier: 0',
		],
	);

	await gm.evaluate((previous) => window.criticalInjuryE2E.tearDown(previous), previous);
	await e2e.step('Critical Injuries end');
}
