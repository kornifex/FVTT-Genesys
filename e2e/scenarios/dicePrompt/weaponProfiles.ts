import { dagger } from '../../weaponProfiles.ts';
import type { PromptState, CardSummary, DicePromptContext } from './shared.ts';



export async function weaponProfilesPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, roll, update, target, attack, named, combatWeapons } = ctx;
	await e2e.step('#366 GM gives Ada a dagger with a Thrown profile, and targets the rival', async () => {
		await gm.evaluate(
			(item) => game.actors.getName('E2E Ada').createEmbeddedDocuments('Item', [item]),
			dagger({ main: ['Melee'], thrown: ['Ranged'] }),
		);
		await update({ actor: 'Rival' }, { 'system.defense': { melee: 1, ranged: 2 } });
		await target('Rival');
	});
	type ProfileAttack = {
		prompt: { skill: string | null; pool: string; defense: PromptState['modifications'] };
		card: { description: string | null; summaries: string[]; qualities: CardSummary['qualities'] };
	};
	// Attacks from a Combat tab row, then rolls the dice fixed: the prompt it opened and the card it posted.
	const attackFromRow = async (row: string, dice: { face: number; faces: number }[]): Promise<ProfileAttack> => {
		const state = await opened(gm, attack(row));
		await gm.fixDice(dice);
		const rolled = await roll();
		const { summaries, qualities } = await gm.evaluate(() => window.dicePromptE2E.lastCard());
		return {
			prompt: {
				skill: state.skill,
				pool: state.pool,
				defense: named(state, 'From Target').filter(({ name }) => name.endsWith('Defense')),
			},
			card: { description: rolled.description, summaries, qualities },
		};
	};
	let thrownAttack: ProfileAttack | null = null;
	await e2e.step('#366 N1 GM attacks from the Dagger (Thrown) row, and rolls three Successes', async () => {
		// A build without Weapon Profiles shows no Thrown row: its attack is left out, so that the scenario goes on.
		if ((await combatWeapons('Ada')).some(({ name }) => name === 'E2E Dagger (Thrown)')) {
			// Ability faces: 4 two Successes, 2 a Success; Difficulty: 1 blank.
			thrownAttack = await attackFromRow('Dagger (Thrown)', [
				{ face: 4, faces: 8 },
				{ face: 2, faces: 8 },
				{ face: 1, faces: 8 },
				{ face: 1, faces: 8 },
			]);
		}
	});
	e2e.expect(
		"#366 N1 an attack from the Dagger (Thrown) row rolls the profile's skill against the target's ranged defense, and its card names the profile, with its damage, Critical rating and qualities",
		thrownAttack,
		{
			prompt: {
				skill: 'Ranged (Ag)',
				pool: 'AA|DD',
				defense: [{ name: 'From Target: Ranged Defense', enabled: false, mods: 'S+ S+' }],
			},
			card: {
				description:
					'Attacking with <strong>E2E Dagger (Thrown)</strong> using <strong>Ranged (Ag<i class="fas fa-star hide-it"></i>)</strong>!',
				summaries: ['Damage (Br + 2) 8 Critical 4', 's Successes 3'],
				qualities: [
					{ text: 'Accurate 1', tooltip: '<p>Aims true.</p>' },
					{ text: 'Limited Ammo 1', tooltip: 'Genesys.Tooltips.NoDescription' },
				],
			},
		},
	);
	let mainAttack: ProfileAttack | null = null;
	await e2e.step('#366 N2 GM attacks from the Dagger row, and rolls a Success', async () => {
		// Proficiency faces: 2 a Success, 1 blank; Difficulty: 1 blank.
		mainAttack = await attackFromRow('Dagger', [
			{ face: 2, faces: 12 },
			{ face: 1, faces: 12 },
			{ face: 1, faces: 12 },
			{ face: 1, faces: 8 },
			{ face: 1, faces: 8 },
		]);
	});
	e2e.expect(
		"#366 N2 an attack from the Dagger row rolls the main profile against the target's melee defense, with the weapon's own damage, Critical rating and qualities",
		mainAttack,
		{
			prompt: {
				skill: 'Melee (Br)',
				pool: 'PPP|DD',
				defense: [{ name: 'From Target: Melee Defense', enabled: false, mods: 'S+' }],
			},
			card: {
				description:
					'Attacking with <strong>E2E Dagger</strong> using <strong>Melee (Br<i class="fas fa-star hide-it"></i>)</strong>!',
				summaries: ['Damage (Br + 1) 5 Critical 3', 's Successes 1'],
				qualities: [],
			},
		},
	);
	await target(null);
	await gm.evaluate(() => game.actors.getName('E2E Ada').items.getName('E2E Dagger').delete());
	await gm.evaluate(() => window.dicePromptE2E.closeSheets());
	await e2e.step('N end');
}
