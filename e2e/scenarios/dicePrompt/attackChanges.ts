import type { DicePromptContext } from './shared.ts';

export async function attackChangesPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, roll, toggle, attack, named } = ctx;
	// Battle Rage (RoT p. 67): one effect of the actor holding a Setback on its melee attacks and 2 damage on them, to which
	// the scenario adds a Critical rating one lower.
	await gm.evaluate(async () => {
		await window.e2e.actor('Ada').createEmbeddedDocuments('ActiveEffect', [
			{
				name: 'E2E Battle Rage',
				system: {
					changes: [
						{ key: 'genesys.pool.melee.self.', value: 'S', type: 'genesys.poolModification' },
						{ key: 'genesys.attack.damage.melee', value: '2', type: 'custom' },
						{ key: 'genesys.attack.critical.melee', value: '-1', type: 'custom' },
					],
				},
			},
		]);
		await window.e2e.settle();
	});
	// What the rows of the open prompt say their effects' Attack Changes add to the attack.
	const attackChanges = () =>
		gm.evaluate(() => {
			const { apps, htmlOf, text } = window.e2e;
			return [...htmlOf(apps('app-dice-prompt')[0])!.querySelectorAll('.pool-modifications-effects')].flatMap((row) => {
				const changes = [...row.querySelectorAll('.attack-change')].map(text);
				return changes.length > 0 ? [{ name: text(row.querySelector('.effect-name')), changes }] : [];
			});
		});
	const battleRage = (state: Awaited<ReturnType<typeof opened>>) =>
		named(state, 'From Self').filter(({ name }) => name.includes('Battle Rage'));

	const club = await opened(gm, attack('Club'));
	e2e.expect(
		"#920 AC1 a melee attack lists Battle Rage once, its Setback followed by what its Attack Changes add to the attack's damage and Critical rating",
		{ row: battleRage(club), changes: await attackChanges() },
		{
			row: [{ name: 'From Self: E2E Battle Rage', enabled: false, mods: 'S+' }],
			changes: [{ name: 'From Self: E2E Battle Rage', changes: ['+2 Damage', '-1 Critical'] }],
		},
	);

	// The Club deals 3 damage, to which it adds no characteristic, and has a Critical rating of 3.
	// Proficiency faces: 4 two Successes; Difficulty and Setback: 1 blank.
	const sixSuccesses = [
		{ face: 4, faces: 12 },
		{ face: 4, faces: 12 },
		{ face: 4, faces: 12 },
		{ face: 1, faces: 8 },
		{ face: 1, faces: 8 },
	];
	const summaries = async () => (await gm.evaluate(() => window.dicePromptE2E.lastCard())).summaries;
	await e2e.step('#920 AC2 GM attacks with the Club, Battle Rage left off, and rolls six Successes', async () => {
		await gm.fixDice(sixSuccesses);
		await roll();
	});
	const withoutRage = await summaries();
	await e2e.step('#920 AC2 GM attacks with the Club again, turns Battle Rage on, and rolls six Successes', async () => {
		await opened(gm, attack('Club'));
		await toggle('Battle Rage');
		await gm.fixDice([...sixSuccesses, { face: 1, faces: 6 }]);
		await roll();
	});
	e2e.expect(
		"#920 AC2 the attack's card adds Battle Rage's 2 damage to its formula and total and takes 1 off its Critical rating, naming the effect under each, only once the roller turned it on",
		{ off: withoutRage, on: await summaries() },
		{
			off: ['Damage (3) 9 Critical 3', 's Successes 6'],
			on: ['Damage (5) 11 E2E Battle Rage +2 Critical 2 E2E Battle Rage -1', 's Successes 6'],
		},
	);

	const pistol = await opened(gm, attack('Pistol'));
	e2e.expect(
		'#920 AC3 a ranged attack lists neither the Setback nor the Attack Changes of Battle Rage, which change melee attacks alone',
		{ row: battleRage(pistol), changes: await attackChanges() },
		{ row: [], changes: [] },
	);
	await gm.evaluate(() => window.dicePromptE2E.closePrompts());

	e2e.expect(
		'#920 AC4 saving the effect from its sheet keeps its Attack Changes',
		(await gm.evaluate(() => window.dicePromptE2E.saveEffectSheet({ actor: 'Ada', effect: 'Battle Rage' }))).changes,
		['genesys.pool.melee.self.=S', 'genesys.attack.damage.melee=2', 'genesys.attack.critical.melee=-1'],
	);

	await gm.evaluate(async () => {
		await window.e2e.actor('Ada').effects.getName('E2E Battle Rage').delete();
		await window.e2e.settle();
	});
	await e2e.step('attackChanges end');
}
