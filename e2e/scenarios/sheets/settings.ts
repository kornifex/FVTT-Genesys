import { installSheetsHelpers, type SheetsContext } from './shared.ts';



export async function settingsPart(ctx: SheetsContext) {
	const { e2e, gm } = ctx;
	// Each setting of the table and the Story Point pools, at a value other than its default but the Skills Compendium's,
	// whose change would load another compendium.
	const as050 = {
		skillsCompendium: 'genesys.crb-skills',
		defaultDifficulty: 'DDD',
		skillForInjuries: 'Cool',
		skillForRepairingVehicleHits: 'Computers',
		currency: 'Credits',
		careerSkillRanks: 6,
		uncoupleSkills: true,
		showDamageOnFailure: true,
		useSuperCharacteristics: true,
		ignoreTalentPyramid: true,
		talentTierVersions: true,
		style: 'terrinoth',
		storyPoints: { gm: 2, player: 5 },
		dicePoolCollapseModificationsDetails: true,
		dicePoolAutoApplyModifications: true,
		dicePoolChanceToSucceedByPermutation: true,
		dicePoolApproximation: 250,
	};
	const settingKeys = Object.keys(as050);
	const settingsBefore = await gm.evaluate((keys) => window.e2e.settings(keys), settingKeys);
	await e2e.step('#415 GM finds settings stored by 0.5.0, in the world and in their browser', () =>
		gm.evaluate((values) => window.sheetsE2E.storeAs050(values), as050),
	);
	e2e.expect(
		'#415 A1 a world and a client saved by 0.5.0 read their settings unchanged',
		await gm.evaluate((keys) => window.e2e.settings(keys), settingKeys),
		as050,
	);
	await e2e.step('#415 GM finds a count below 0 stored by 0.5.0', () =>
		gm.evaluate(() => window.sheetsE2E.storeAs050({ careerSkillRanks: -3 })),
	);
	e2e.expect(
		'#415 A2 a count below 0 that 0.5.0 stored reads as the default',
		await gm.evaluate(() => CONFIG.genesys.settings.freeCareerSkillRanks),
		4,
	);
	await gm.evaluate(() => window.e2e.setSettings({ careerSkillRanks: 6 }));
	e2e.expect(
		'#415 A3 a count below 0, an unknown Style or a malformed Story Point pool is refused, and the setting keeps its value',
		await gm.evaluate((values) => window.sheetsE2E.trySettings(values), [
			['careerSkillRanks', -1],
			['dicePoolApproximation', -5],
			['style', 'unknown'],
			['storyPoints', { gm: 'x', player: 1 }],
			['storyPoints', { gm: -1, player: 1 }],
		] satisfies [string, unknown][]),
		[
			{ key: 'careerSkillRanks', refused: true, holds: 6 },
			{ key: 'dicePoolApproximation', refused: true, holds: 250 },
			{ key: 'style', refused: true, holds: 'terrinoth' },
			{ key: 'storyPoints', refused: true, holds: { gm: 2, player: 5 } },
			{ key: 'storyPoints', refused: true, holds: { gm: 2, player: 5 } },
		],
	);
	await gm.evaluate((values) => window.e2e.setSettings(values), settingsBefore);

	// §#617: 0.6.0 no longer registers the Magical Girl symbols' client setting, which a browser may still hold.
	const errorsBefore = gm.errors.length;
	await e2e.step('#617 GM reloads with the Magical Girl symbols turned on in their browser by 0.5.0', async () => {
		await gm.evaluate(() => localStorage.setItem('genesys.useMagicalGirlSymbols', 'true'));
		await gm.reload();
	});
	await gm.evaluate(installSheetsHelpers);
	e2e.expect(
		'#617 A1 a browser that turned the Magical Girl symbols on loads the world without error, and the setting is gone',
		{
			errors: gm.errors.slice(errorsBefore),
			registered: await gm.evaluate(() => game.settings.settings.has('genesys.useMagicalGirlSymbols')),
		},
		{ errors: [], registered: false },
	);
	await gm.evaluate(() => localStorage.removeItem('genesys.useMagicalGirlSymbols'));
}
