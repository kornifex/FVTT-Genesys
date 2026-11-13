import { installCriticalInjuryHelpers, type DicePromptContext } from './shared.ts';

export async function magicAttackPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, click, roll } = ctx;
	await gm.evaluate(installCriticalInjuryHelpers);
	await gm.evaluate(async () => {
		const skill = (name: string, rank: number) => ({ name, type: 'skill', system: { characteristic: 'intellect', rank } });
		// Fireball, an Easy attack, with Fire (+1, checked by default), whose Burn counts the caster's ranks in Knowledge
		// (CRB p. 215).
		const fire = {
			id: 'fire',
			name: 'Fire',
			difficulty: 1,
			startsChecked: true,
			qualities: [
				{
					name: 'Burn',
					description: '',
					activation: 'passive',
					advantageCost: 0,
					ratingSource: 'skillRanks',
					rating: 1,
					ratingSkill: 'Knowledge',
				},
			],
			critical: null,
			doublesDamageCharacteristic: false,
		};
		await Actor.createDocuments([
			{
				name: 'E2E Mage',
				type: 'character',
				system: { characteristics: { intellect: 3 } },
				items: [
					skill('Arcana', 2),
					skill('Knowledge', 2),
					{
						name: 'E2E Fireball',
						type: 'spell',
						system: { action: 'attack', difficulty: 1, isAttack: true, skills: ['Arcana'], additionalEffects: [fire] },
					},
				],
			},
		]);
	});
	const cast = click(gm, { actor: 'Mage' }, '.tab-magic .spell .name button|E2E Fireball');
	const card = async () => {
		const { labels, summaries, qualities, spellEffects } = await gm.evaluate(() => window.dicePromptE2E.lastCard());
		const critical = await gm.evaluate(() => window.criticalInjuryE2E.attackCard());
		return { labels, summaries, qualities: qualities.map(({ text }) => text), spellEffects, critical };
	};

	const opening = await opened(gm, cast);
	e2e.expect('#706 MA1 the Fireball opens Arcana at Average: Easy and Fire, checked by default', opening.pool, 'PPA|DD');

	// Proficiency on two Successes, then an Advantage; Ability on a Success and an Advantage; Difficulty on blank faces.
	await gm.fixDice([
		{ face: 4, faces: 12 },
		{ face: 6, faces: 12 },
		{ face: 7, faces: 8 },
		{ face: 1, faces: 8 },
		{ face: 1, faces: 8 },
	]);
	const hit = await roll();
	e2e.expect(
		"#706 MA2 the card shows the damage as Intellect 3 plus the Successes, Burn rated by the Mage's 2 ranks in Knowledge, and no Critical Injury for Advantage",
		{ description: hit.description, ...(await card()) },
		{
			description: 'Casting <strong>E2E Fireball</strong> using <strong>Arcana (Int<i class="fas fa-star hide-it"></i>)</strong>!',
			labels: ['Roll Results', 'Attack Results', 'Summary', 'Attack Qualities', 'Additional Effects', 'Dice'],
			summaries: ['Damage (Int + 0) 6 Critical 0', 's Successes 3 a Advantage 2', 'Strain suffered by the caster 2'],
			qualities: ['Burn 2'],
			spellEffects: ['Fire'],
			critical: { triggers: null, button: false },
		},
	);

	await opened(gm, cast);
	// Proficiency on a Triumph, then an Advantage; Ability on a Success and an Advantage; Difficulty on blank faces.
	await gm.fixDice([
		{ face: 12, faces: 12 },
		{ face: 6, faces: 12 },
		{ face: 7, faces: 8 },
		{ face: 1, faces: 8 },
		{ face: 1, faces: 8 },
	]);
	await roll();
	e2e.expect('#706 MA3 a Triumph offers the Critical Injury roll', (await card()).critical, {
		triggers: 'Critical Injury Triggers 1',
		button: true,
	});
	await e2e.step('magicAttack end');
}
