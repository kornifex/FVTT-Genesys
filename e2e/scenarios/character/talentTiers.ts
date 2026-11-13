import type { ScenarioContext } from '../../scenario.ts';
import { installCharacterHelpers, type Evaluate } from './shared.ts';

/** §#200: a talent's tier kept from 1 to 5, and one saved above 5 read as 5. */
export async function talentTiers(
	e2e: ScenarioContext,
	page: Evaluate,
	notified: (key: string, data?: Record<string, unknown>) => Promise<string>,
	notifications: () => Promise<string[]>,
) {
	const { gm } = e2e;
	const stored = (uuid: string) => page((uuid) => fromUuidSync(uuid)._source.system.tier, uuid);
	let uuid = '';
	await e2e.step('#200 M1 a talent created at tier 8, then set to 3 and updated to 8', async () => {
		uuid = await page(async () => (await Item.create({ name: 'E2E Tier Eight', type: 'talent', system: { tier: 8 } })).uuid, undefined);
	});
	const created = await stored(uuid);
	await page((uuid) => fromUuidSync(uuid).update({ 'system.tier': 3 }), uuid);
	await page((uuid) => fromUuidSync(uuid).update({ 'system.tier': 8 }), uuid);
	e2e.expect(
		'#200 M1 a talent created or updated above tier 5 is stored at tier 5',
		{ created, updated: await stored(uuid) },
		{ created: 5, updated: 5 },
	);
	await page((uuid) => fromUuidSync(uuid).update({ 'system.tier': 3 }), uuid);
	let shown = '';
	await e2e.step("#200 M2 8 typed in the talent sheet's Tier", async () => {
		shown = await page((uuid) => window.characterE2E.typeTier(uuid, 8), uuid);
	});
	e2e.expect(
		"#200 M2 typing 8 in the talent sheet's Tier stores and shows 5",
		{ shown, stored: await stored(uuid) },
		{ shown: '5', stored: 5 },
	);

	// A world saved before #174: tier 6 written to the database, past the cleaning that now keeps it at 5.
	const targets: Record<string, string> = {};
	await e2e.step(
		'#200 M3 talents saved at tier 6 in the Items directory, on a character and in a compendium, then the world reloaded',
		async () => {
			targets.world = await page(() => window.characterE2E.worldItem('Old Talent'), undefined);
			await page((name) => window.characterE2E.create(name), 'Veteran');
			await page(
				(data) => window.characterE2E.createItems('Veteran', [data]),
				await page(() => game.items.getName('E2E Old Talent').toObject(), undefined),
			);
			targets.actor = await page(() => game.actors.getName('E2E Veteran').items.getName('E2E Old Talent').uuid, undefined);
			targets.pack = await page(() => window.characterE2E.createPack(), undefined);
			for (const target of Object.values(targets)) await page((uuid) => window.characterE2E.seedTier({ uuid }, 6), target);
			const errors = gm.errors.length;
			await gm.reload();
			await gm.evaluate(installCharacterHelpers);
			e2e.log('#200 M3 console errors while loading the world', gm.errors.slice(errors));
		},
	);
	const loaded: Record<string, unknown> = {};
	for (const [where, target] of Object.entries(targets)) {
		loaded[where] = {
			...(await page((uuid) => window.characterE2E.loadedTalent(uuid), target)),
			database: await page((uuid) => window.characterE2E.storedTier({ uuid }), target),
			sheet: await page((uuid) => window.characterE2E.talentSheetTier(uuid), target),
		};
	}
	const asFive = { tier: 5, source: 5, invalid: false, database: 6, sheet: '5' };
	e2e.expect(
		'#200 M3 a talent saved at tier 6 loads with no error and reads as tier 5, while the database keeps 6 until it is saved again',
		loaded,
		{ world: asFive, actor: asFive, pack: asFive },
	);
	e2e.expect(
		'#200 M3 a talent saved at tier 6 counts once at tier 5 in the Talent Pyramid',
		await page((name) => window.characterE2E.pyramidTotals(name), 'Veteran'),
		{
			1: 0,
			2: 0,
			3: 0,
			4: 0,
			5: 1,
		},
	);
	await e2e.step('#200 M4 the talent saved at tier 6 dropped on a character, with then without the Talent Pyramid', async () => {
		await page((name) => window.characterE2E.create(name), 'Buyer');
		await page((name) => window.characterE2E.open(name), 'Buyer');
		await page((name) => window.characterE2E.applyArchetype(name, 'Plain Archetype'), 'Buyer');
		await e2e.settle();
		await notifications();
		await page((name) => window.characterE2E.drop(name, window.characterE2E.worldItem('Old Talent')), 'Buyer');
		await e2e.settle();
		e2e.expect('#200 M4 the Talent Pyramid refuses a talent saved at tier 6 as a tier 5 one', await notifications(), [
			await notified('Genesys.Notifications.CannotPurchaseTalentTier', { tier: 5, lowerTier: 4, minimum: 2 }),
		]);
		await page((rules) => window.e2e.setSettings(rules), { ignoreTalentPyramid: true });
		await page((name) => window.characterE2E.drop(name, window.characterE2E.worldItem('Old Talent')), 'Buyer');
	});
	e2e.expect(
		'#200 M4 under Ignore Talent Pyramid, a talent saved at tier 6 costs 25 XP',
		await page((name) => window.characterE2E.journal(name).slice(-1), 'Buyer'),
		['NewTalent -25 E2E Old Talent tier 5 rank 1'],
	);
	await page((rules) => window.e2e.setSettings(rules), { ignoreTalentPyramid: false });
	await page((name) => window.characterE2E.close(name), 'Buyer');
}
