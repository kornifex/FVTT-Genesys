import { thrownProfile } from '../../weaponProfiles.ts';
import type { SheetsContext } from './shared.ts';

export async function weaponProfilesPart(
	ctx: SheetsContext,
	weaponProfiles: () => Promise<{
		main: { skills: string[]; qualities: { name: string; rating: number }[] };
		extraProfiles: ({ name: string; skills: string[]; qualities: { name: string; rating: number }[] } & Record<string, unknown>)[];
		blocks: number;
	}>,
) {
	const { e2e, gm } = ctx;
	await gm.evaluate(async () => {
		const sheets = window.sheetsE2E;
		await sheets.closeAll();
		for (const name of ['weapon', 'vehicleWeapon']) {
			await sheets.open(name);
			await sheets.clickTab(name, 'data');
		}
	});
	e2e.expect(
		"#366 B1 a weapon's Data tab ends with an Add Weapon Profile button, a vehicle weapon's has none",
		await gm.evaluate(() =>
			Object.fromEntries(
				['weapon', 'vehicleWeapon'].map((name) => [
					name,
					[...window.e2e.htmlOf(game.items.getName(`E2E ${name}`).sheet)!.querySelectorAll('.add-profile button')].map(
						window.e2e.text,
					),
				]),
			),
		),
		{ weapon: ['Add Weapon Profile'], vehicleWeapon: [] },
	);
	const mainBefore = (await weaponProfiles()).main;
	await e2e.step('#366 B2 GM adds a Weapon Profile, edits each of its fields, and drops a quality and a skill on its block', () =>
		gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			// A build without Weapon Profiles has no Add Weapon Profile button.
			if (!window.e2e.htmlOf(game.items.getName('E2E weapon').sheet)!.querySelector('.add-profile button')) return;
			await sheets.click('weapon', '.add-profile button');
			await sheets.changeField('weapon', '.weapon-profile .profile-name', 'Thrown');
			await sheets.changeField('weapon', '.weapon-profile .profile-damage-characteristic', 'agility');
			await sheets.changeField('weapon', '.weapon-profile .profile-damage', '2');
			await sheets.changeField('weapon', '.weapon-profile .profile-critical', '4');
			await sheets.changeField('weapon', '.weapon-profile .profile-range', 'short');
			await sheets.drop('weapon', { type: 'Item', name: 'quality' }, '.weapon-profile');
			await sheets.drop('weapon', { type: 'Item', name: 'skill' }, '.weapon-profile .profile-skills');
		}),
	);
	e2e.expect(
		"#366 B2 the added profile stores each field changed on its block, and the quality and skill dropped on it, leaving the main profile's",
		await weaponProfiles(),
		{
			main: mainBefore,
			extraProfiles: [
				{
					name: 'Thrown',
					skills: ['E2E skill'],
					damageCharacteristic: 'agility',
					baseDamage: 2,
					critical: 4,
					range: 'short',
					qualities: [{ name: 'E2E quality', rating: 1 }],
					attackSkill: '',
				},
			],
			blocks: 1,
		},
	);
	await e2e.step("#366 B3 GM rates the profile's quality 3 and deletes its skill", () =>
		gm.evaluate(async () => {
			const sheet = window.e2e.htmlOf(game.items.getName('E2E weapon').sheet)!;
			const rating = sheet.querySelector<HTMLInputElement>('.weapon-profile .profile-qualities input');
			if (!rating) return;
			rating.value = '3';
			rating.dispatchEvent(new Event('blur'));
			await window.e2e.settle();
			await window.sheetsE2E.click('weapon', '.weapon-profile .profile-skills button');
		}),
	);
	const ratedAndUnskilled = await weaponProfiles();
	e2e.expect(
		"#366 B3 the profile's quality takes its new rating and its skill is deleted, leaving the main profile's",
		{
			main: ratedAndUnskilled.main,
			skills: ratedAndUnskilled.extraProfiles[0]?.skills,
			qualities: ratedAndUnskilled.extraProfiles[0]?.qualities,
		},
		{ main: mainBefore, skills: [], qualities: [{ name: 'E2E quality', rating: 3 }] },
	);
	// The deletion asks first since #577: No keeps the profile, Yes deletes it.
	const deleteProfile = (answer: 'yes' | 'no') =>
		gm.evaluate(async (answer) => {
			if (!window.e2e.htmlOf(game.items.getName('E2E weapon').sheet)!.querySelector('.weapon-profile .delete-profile')) return null;
			await window.sheetsE2E.click('weapon', '.weapon-profile .delete-profile');
			return window.e2e.answerConfirm(answer);
		}, answer);
	let askedForProfile: unknown;
	await e2e.step('#577 W1 GM deletes the profile, and answers No', async () => {
		askedForProfile = await deleteProfile('no');
	});
	e2e.expect(
		'#577 W1 deleting an extra Weapon Profile asks first, in the deletion dialog that names it as its row does, and No keeps it',
		{ asked: askedForProfile, blocks: (await weaponProfiles()).blocks },
		{
			asked: {
				application: 'DialogV2',
				title: 'Confirm Deletion',
				content: "Delete E2E weapon (Thrown)? This can't be undone.",
				buttons: ['yes', 'no'],
				defaultButton: 'no',
			},
			blocks: 1,
		},
	);
	await e2e.step('#366 B4 GM deletes the profile', () => deleteProfile('yes'));
	e2e.expect('#366 B4 the deleted profile leaves the weapon and its sheet', await weaponProfiles(), {
		main: mainBefore,
		extraProfiles: [],
		blocks: 0,
	});
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	await e2e.step("#366 B5 GM gives the Hero's sword a Thrown profile and sends it to chat", () =>
		gm.evaluate(
			async (profile) => {
				const sheets = window.sheetsE2E;
				await sheets.update('Hero/Sword', { 'system.extraProfiles': [profile] });
				sheets.readMessages();
				await sheets.open('Hero');
				await sheets.sendToChat('Hero', 'Sword');
			},
			thrownProfile(['Ranged']),
		),
	);
	e2e.expect(
		"#366 B5 a weapon's card lists its main profile, then each extra profile named as its row, with its skill, range, damage, Critical rating and qualities",
		await gm.evaluate(() =>
			window.sheetsE2E.readMessages().map(({ content }) => {
				const { text } = window.e2e;
				const message = document.createElement('div');
				message.innerHTML = content;
				const card = message.querySelector('.item-card')!;
				return {
					main: [...card.querySelectorAll(':scope > .details-grid span')].map(text),
					mainQualities: [...card.querySelectorAll(':scope > .qualities .quality')].map(text),
					extraProfiles: [...card.querySelectorAll('.weapon-profile')].map((profile) => ({
						name: text(profile.querySelector('.profile-name')),
						details: [...profile.querySelectorAll('.details-grid span')].map(text),
						qualities: [...profile.querySelectorAll('.quality')].map(text),
					})),
				};
			}),
		),
		[
			{
				main: ['Melee', 'Engaged', '3 + Br', '0'],
				mainQualities: ['E2E Pierce 1'],
				extraProfiles: [
					{
						name: 'E2E Sword (Thrown)',
						details: ['Ranged', 'Short', '2 + Br', '4'],
						qualities: ['Accurate 1', 'Limited Ammo 1'],
					},
				],
			},
		],
	);
	await gm.evaluate(() => window.sheetsE2E.closeAll());
}
