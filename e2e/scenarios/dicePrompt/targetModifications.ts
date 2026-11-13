import type { DicePromptContext } from './shared.ts';



export async function targetModificationsPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, toggle, roll, update, target, skillRoll, attack, rows, named } = ctx;
	await target('Rival');
	const coolAtRival = await opened(gm, skillRoll('Cool'));
	e2e.expect(
		'#32 C1 the prompt lists "From Self" and "From Target" Pool Modifications for check, characteristic and skill keys',
		rows(coolAtRival),
		[
			{ name: 'From Self: E2E Focus', enabled: false, mods: 'a+' },
			{ name: 'From Self: E2E Poise', enabled: false, mods: 'S+' },
			{ name: 'From Self: E2E Nerve', enabled: false, mods: 'B+' },
			{ name: 'From Target: E2E Hex', enabled: false, mods: 'S+' },
			{ name: 'From Target: E2E Glare', enabled: false, mods: 'D+' },
			{ name: 'From Target: E2E Ward', enabled: false, mods: 'h+' },
		],
	);
	const pistol = await opened(gm, attack('Pistol'));
	e2e.expect(
		'#49 C2 an attack rolls the owned "Ranged (light)" with the Pool Modification on "Ranged (Light)", and the ranged defense',
		{ skill: pistol.skill, pool: pistol.pool, rows: rows(pistol) },
		{
			skill: 'Ranged (light) (Ag)',
			pool: 'PP|DD',
			rows: [
				{ name: 'From Self: E2E Focus', enabled: false, mods: 'a+' },
				{ name: 'From Self: E2E Sights', enabled: false, mods: 'B+' },
				{ name: 'From Target: E2E Hex', enabled: false, mods: 'S+' },
				{ name: 'From Target: Ranged Defense', enabled: false, mods: 'S+ S+' },
			],
		},
	);
	await toggle('E2E Sights');
	await toggle('Ranged Defense');
	const pistolRoll = await roll();
	e2e.expect(
		'#49 C3 the attack rolls the owned skill with the toggled Pool Modifications',
		{ speaker: pistolRoll.speaker, description: pistolRoll.description, formula: pistolRoll.formula },
		{
			speaker: 'Ada',
			description:
				'Attacking with <strong>E2E Pistol</strong> using <strong>Ranged (light) (Ag<i class="fas fa-star hide-it"></i>)</strong>!',
			formula: '2dp + 0da + 2di + 1db + 2ds',
		},
	);

	// The target's defense against the attack's range, for an adversary and a character (§#32, §#40).
	const defenseRows = async (weapon: string) =>
		named(await opened(gm, attack(weapon)), 'From Target').filter(({ name }) => name.endsWith('Defense'));
	const defenses: Record<string, unknown> = {};
	const expectedDefenses: Record<string, unknown> = {};
	for (const targetName of ['Rival', 'Mark']) {
		await target(targetName);
		for (const defense of [0, 1, 2]) {
			await update({ actor: targetName }, { 'system.defense': { melee: defense, ranged: defense } });
			for (const [weapon, range] of [
				['Spear', 'Melee'],
				['Pistol', 'Ranged'],
			]) {
				defenses[`${targetName} ${defense} ${range}`] = await defenseRows(weapon);
				expectedDefenses[`${targetName} ${defense} ${range}`] =
					defense === 0
						? []
						: [{ name: `From Target: ${range} Defense`, enabled: false, mods: Array(defense).fill('S+').join(' ') }];
			}
		}
	}
	e2e.expect(
		"#32 C4 an attack adds one Setback per point of an adversary's or a character's defense against its range, none at 0",
		defenses,
		expectedDefenses,
	);

	// A targeted vehicle (§#201).
	await target('Wagon');
	const vehicleDefenses: Record<string, unknown> = {};
	for (const defense of [2, 5]) {
		await update({ actor: 'Wagon' }, { 'system.defense': defense });
		for (const weapon of ['Spear', 'Pistol']) vehicleDefenses[`${defense} ${weapon}`] = await defenseRows(weapon);
	}
	const vehicleRow = (range: string, count: number) => [
		{ name: `From Target: ${range} Defense`, enabled: false, mods: Array(count).fill('S+').join(' ') },
	];
	e2e.expect('#201 C5 an attack against a targeted vehicle adds one Setback per point of its defense, up to 4', vehicleDefenses, {
		'2 Spear': vehicleRow('Melee', 2),
		'2 Pistol': vehicleRow('Ranged', 2),
		'5 Spear': vehicleRow('Melee', 4),
		'5 Pistol': vehicleRow('Ranged', 4),
	});
	const coolAtWagon = await opened(gm, skillRoll('Cool'));
	e2e.expect(
		'#201 C6 a check made while a vehicle is targeted lists its target Pool Modifications',
		named(coolAtWagon, 'From Target'),
		[{ name: 'From Target: E2E Smoke', enabled: false, mods: 'S+' }],
	);

	// The Pilot's Defensive Driving raises the defense of the vehicle they pilot (§#482): the Driver, first member of the
	// Rig's Helm, holds 2 ranks of a talent adding 1 Piloted Vehicle Defense.
	await target('Rig');
	const rigDefense = () => gm.evaluate(() => window.dicePromptE2E.vehicleDefense('Rig'));
	const rigAttacks = async () => ({
		defense: await rigDefense(),
		Spear: await defenseRows('Spear'),
		Pistol: await defenseRows('Pistol'),
	});
	e2e.expect('#482 A0 a vehicle whose Roles hold no Pilot Role counts its own defense alone', await rigAttacks(), {
		defense: { total: '1', vehicle: '1' },
		Spear: vehicleRow('Melee', 1),
		Pistol: vehicleRow('Ranged', 1),
	});
	e2e.expect(
		'#482 A1 the Helm marked as the Pilot Role on the sheet',
		await gm.evaluate(() => window.dicePromptE2E.clickPilotRole({ vehicle: 'Rig', role: 'Helm' })),
		true,
	);
	e2e.expect(
		"#482 A2 the Pilot's 2 ranks of Piloted Vehicle Defense raise the vehicle's defense on its sheet and against an attack",
		await rigAttacks(),
		{ defense: { total: '3', vehicle: '1' }, Spear: vehicleRow('Melee', 3), Pistol: vehicleRow('Ranged', 3) },
	);
	await e2e.step("#482 A3 the Pilot's talent effect turned off", () =>
		gm.evaluate(() =>
			window.dicePromptE2E.setItemEffectDisabled({
				actor: 'Driver',
				item: 'Steady Hands',
				effect: 'Steady Hands',
				disabled: true,
			}),
		),
	);
	e2e.expect("#482 A3 the vehicle's open sheet follows its Pilot's effects", await rigDefense(), { total: '1', vehicle: '1' });
	await e2e.step("#482 A4 the Pilot's talent effect turned on again", () =>
		gm.evaluate(() =>
			window.dicePromptE2E.setItemEffectDisabled({
				actor: 'Driver',
				item: 'Steady Hands',
				effect: 'Steady Hands',
				disabled: false,
			}),
		),
	);
	e2e.expect("#482 A4 the vehicle's open sheet shows its Pilot's bonus again", await rigDefense(), { total: '3', vehicle: '1' });
	await update({ actor: 'Rig' }, { 'system.defense': 3 });
	e2e.expect("#482 A5 the vehicle's defense raised by its Pilot counts up to 4 (CRB p. 223)", await rigAttacks(), {
		defense: { total: '4', vehicle: '3' },
		Spear: vehicleRow('Melee', 4),
		Pistol: vehicleRow('Ranged', 4),
	});
	await target(null);
	await e2e.step('C end');
}
