import type { ScenarioContext } from '../../scenario.ts';
import { dagger } from '../../weaponProfiles.ts';
import type { Evaluate } from './shared.ts';

/** §#366, part N: a weapon with an extra Weapon Profile is one piece of equipment, with a Combat tab row per profile. */
export async function weaponProfiles(e2e: ScenarioContext, page: Evaluate) {
	const W = 'Wielder';
	// The character owns every Skills Compendium skill, at rank 0.
	const weapon = dagger({ main: ['Melee', 'Brawl'], thrown: ['Ranged', 'Athletics'] });
	const rows = () => page((name) => window.characterE2E.weaponRows(name), W);
	const choose = (row: string, skill: string) => page((args) => window.characterE2E.chooseAttackSkill(args), { actor: W, row, skill });

	await e2e.step('#366 N1 a character given a dagger with a Thrown profile, equipped', async () => {
		await page((name) => window.characterE2E.create(name), W);
		await page((args) => window.characterE2E.createItems(args.name, args.items), { name: W, items: [weapon] });
		await page((name) => window.characterE2E.open(name), W);
	});
	e2e.expect(
		'#366 N1 the dagger shows one Inventory tab row and counts its encumbrance once, but shows a Combat tab row per profile, each with its Attack Skill',
		await rows(),
		{
			inventory: ['Dagger'],
			encumbrance: 1,
			combat: [
				{ name: 'Dagger', skill: '[Melee]' },
				{ name: 'Dagger (Thrown)', skill: '[Ranged]' },
			],
			stored: { Dagger: ['', ''] },
		},
	);

	await e2e.step("#366 N2 Athletics chosen on the Thrown row's Attack Skill select", () => choose('Dagger (Thrown)', 'Athletics'));
	const thrownChosen = await rows();
	await e2e.step("#366 N2 Brawl chosen on the main row's Attack Skill select", () => choose('Dagger', 'Brawl'));
	const mainChosen = await rows();
	e2e.expect(
		"#366 N2 the Attack Skill chosen on one profile's row is stored on that profile, and doesn't change the other row's",
		{
			thrownChosen: { combat: thrownChosen.combat, stored: thrownChosen.stored },
			mainChosen: { combat: mainChosen.combat, stored: mainChosen.stored },
		},
		{
			thrownChosen: {
				combat: [
					{ name: 'Dagger', skill: '[Melee]' },
					{ name: 'Dagger (Thrown)', skill: '[Athletics]' },
				],
				stored: { Dagger: ['', 'Athletics'] },
			},
			mainChosen: {
				combat: [
					{ name: 'Dagger', skill: '[Brawl]' },
					{ name: 'Dagger (Thrown)', skill: '[Athletics]' },
				],
				stored: { Dagger: ['Brawl', 'Athletics'] },
			},
		},
	);

	await page((name) => window.characterE2E.close(name), W);
}
