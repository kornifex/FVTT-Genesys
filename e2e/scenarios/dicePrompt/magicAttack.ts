import { installCriticalInjuryHelpers, type DicePromptContext } from './shared.ts';

export async function magicAttackPart(ctx: DicePromptContext) {
	const { e2e, gm, player, opened, click, roll } = ctx;
	await gm.evaluate(installCriticalInjuryHelpers);
	await gm.evaluate(async () => {
		const skill = (name: string, rank: number) => ({ name, type: 'skill', system: { characteristic: 'intellect', rank } });
		// Fireball, an Easy attack, with Fire (+1, checked by default), whose Burn counts the caster's ranks in the skill the
		// spell names, Knowledge for a new spell (CRB p. 215).
		const fire = {
			id: 'fire',
			name: 'Fire',
			description: '<p>Sets the target ablaze.</p>',
			difficulty: 1,
			startsChecked: true,
			qualities: [{ name: 'Burn', description: '', activation: 'passive', advantageCost: 0, ratingSource: 'skillRanks', rating: 1 }],
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
					skill('Knowledge (Lore)', 3),
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

	e2e.expect(
		"#760 MA2 the attack's card shows the description of Fire as its tooltip",
		await gm.evaluate(() => {
			const content = document.createElement('div');
			content.innerHTML = game.messages.contents.at(-1).content;
			return content
				.querySelector('.spell-effect .name')
				?.getAttribute('data-tooltip')
				?.replace(/<[^>]*>/g, '');
		}),
		'Sets the target ablaze.',
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

	// #877: the spell, not each effect, names the skill whose ranks its effects' qualities count, and a player who owns
	// the caster changes it, as Realms of Terrinoth counts Knowledge (Lore).
	await gm.evaluate((user) => window.e2e.setOwnership(game.actors.getName('E2E Mage'), user, 'OWNER'), e2e.playerUser);
	await e2e.step("#877 MA4 the player opens the data tab of the Mage's E2E Fireball", () =>
		player.evaluate(async () => {
			const sheet = game.actors.getName('E2E Mage').items.getName('E2E Fireball').sheet;
			const root = await window.e2e.render(sheet);
			root.querySelector<HTMLElement>('.sheet-tabs [data-tab="data"]')!.click();
			const field = await window.e2e.waitFor('the field of the skill', () =>
				root.querySelector<HTMLInputElement>('.tab[data-tab="data"].active input[name="system.ratingSkill"]'),
			);
			field.dataset.e2e = 'rating-skill';
		}),
	);
	e2e.expect(
		"#877 MA4 a new spell's effects count ranks in Knowledge",
		await player.evaluate(() => document.querySelector<HTMLInputElement>('[data-e2e="rating-skill"]')!.value),
		'Knowledge',
	);
	await e2e.step('#877 MA5 the player types Knowledge (Lore) in the skill the Fireball’s effects count ranks in', async () => {
		await player.page.fill('[data-e2e="rating-skill"]', 'Knowledge (Lore)');
		await player.page.press('[data-e2e="rating-skill"]', 'Tab');
	});
	e2e.expect(
		"#877 MA5 the Fireball counts the caster's ranks in Knowledge (Lore)",
		await gm.evaluate(() => game.actors.getName('E2E Mage').items.getName('E2E Fireball').system.ratingSkill),
		'Knowledge (Lore)',
	);

	await opened(gm, cast);
	await gm.fixDice([
		{ face: 4, faces: 12 },
		{ face: 6, faces: 12 },
		{ face: 7, faces: 8 },
		{ face: 1, faces: 8 },
		{ face: 1, faces: 8 },
	]);
	await roll();
	e2e.expect(
		"#877 MA6 the Fireball cast again: the card rates Burn by the Mage's 3 ranks in Knowledge (Lore)",
		(await card()).qualities,
		['Burn 3'],
	);
	await gm.evaluate((user) => window.e2e.setOwnership(game.actors.getName('E2E Mage'), user, 'NONE'), e2e.playerUser);
	await e2e.step('magicAttack end');
}
