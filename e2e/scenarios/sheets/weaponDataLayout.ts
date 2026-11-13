import { thrownProfile } from '../../weaponProfiles.ts';
import type { WeaponDataLayout, SheetsContext } from './shared.ts';



export async function weaponDataLayoutPart(ctx: SheetsContext, weaponProfiles: () => Promise<{ main: { skills: string[]; qualities: { name: string; rating: number }[] }; extraProfiles: ({ name: string; skills: string[]; qualities: { name: string; rating: number }[] } & Record<string, unknown>)[]; blocks: number }>) {
	const { e2e, gm } = ctx;
	const heights = [500, 950];
	let profiled: WeaponDataLayout[] = [];
	await e2e.step('#428 A1 GM gives the weapon a Thrown profile, then resizes its sheet to two heights', async () => {
		profiled = await gm.evaluate(
			async ({ profile, heights }) => {
				const sheets = window.sheetsE2E;
				await sheets.update('weapon', { 'system.extraProfiles': [profile] });
				await sheets.open('weapon');
				await sheets.clickTab('weapon', 'data');
				return sheets.weaponDataLayout('weapon', heights);
			},
			{ profile: thrownProfile(['Ranged']), heights },
		);
	});
	e2e.expect(
		"#428 A1 the Thrown profile's block follows right under the main profile's rows, and the Add Weapon Profile button under its own, at either window height",
		profiled.map(({ gaps }) => gaps),
		[
			[0, 0],
			[0, 0],
		],
	);
	e2e.expect(
		"#428 A2 the Data tab's blocks keep their height when the window grows",
		{ windowGrew: profiled[1].window > profiled[0].window, blocksGrew: profiled[1].content - profiled[0].content },
		{ windowGrew: true, blocksGrew: 0 },
	);
	let single: Record<string, WeaponDataLayout[]> = {};
	await e2e.step(
		'#428 A3 GM deletes the Thrown profile, then resizes the sheets of the weapon and the vehicle weapon to two heights',
		async () => {
			single = await gm.evaluate(async (heights) => {
				const sheets = window.sheetsE2E;
				await sheets.update('weapon', { 'system.extraProfiles': [] });
				await sheets.open('vehicleWeapon');
				await sheets.clickTab('vehicleWeapon', 'data');
				return {
					weapon: await sheets.weaponDataLayout('weapon', heights),
					vehicleWeapon: await sheets.weaponDataLayout('vehicleWeapon', heights),
				};
			}, heights);
		},
	);
	e2e.expect(
		"#428 A3 a weapon with no extra profile, and a vehicle weapon, keep their main profile's rows in place whatever the window's height",
		{ weapon: single.weapon[1].mainRows, vehicleWeapon: single.vehicleWeapon[1].mainRows },
		{ weapon: single.weapon[0].mainRows, vehicleWeapon: single.vehicleWeapon[0].mainRows },
	);
	e2e.expect(
		'#428 A4 a weapon with no extra profile shows its Add Weapon Profile button right under its main profile, at either window height',
		single.weapon.map(({ gaps }) => gaps),
		[[0], [0]],
	);
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	// §#439: the sheet takes a drop on its whole element; a skill or a quality dropped outside an extra profile's block
	// goes to the main profile.
	await e2e.step(
		"#439 GM drops a quality on the Data tab under the weapon's blocks and a skill on its header, the weapon having a Thrown profile",
		() =>
			gm.evaluate(
				async (profile) => {
					const sheets = window.sheetsE2E;
					await sheets.update('weapon', { 'system.extraProfiles': [profile], 'system.skills': [], 'system.qualities': [] });
					await sheets.open('weapon');
					await sheets.clickTab('weapon', 'data');
					await sheets.drop('weapon', { type: 'Item', name: 'quality' }, '.tab[data-tab="data"]');
					await sheets.drop('weapon', { type: 'Item', name: 'skill' }, '.window-header');
				},
				thrownProfile(['Ranged']),
			),
	);
	e2e.expect(
		"#439 A1 a quality dropped under the Data tab's blocks and a skill dropped on the window's header go to the main profile, leaving the extra profile's",
		await weaponProfiles(),
		{
			main: { skills: ['E2E skill'], qualities: [{ name: 'E2E quality', rating: 1 }] },
			extraProfiles: [
				{
					...thrownProfile(['Ranged']),
					qualities: [
						{ name: 'Accurate', rating: 1 },
						{ name: 'Limited Ammo', rating: 1 },
					],
				},
			],
			blocks: 1,
		},
	);
	await gm.evaluate(async () => {
		await window.sheetsE2E.update('weapon', { 'system.extraProfiles': [], 'system.skills': [], 'system.qualities': [] });
		await window.sheetsE2E.closeAll();
	});
}
