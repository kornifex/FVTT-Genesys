import type { DicePromptContext } from './shared.ts';



export async function settingsPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, setSetting, skillRoll } = ctx;
	const defaultDifficulty = async (value: string) => {
		// A refused value rejects the setting's write, which is what the step reads.
		const refused = await setSetting('defaultDifficulty', value).then(
			() => false,
			() => true,
		);
		const state = await opened(gm, () => gm.evaluate(() => ui.chat.processMessage('/gendr')));
		return { refused, applied: await gm.evaluate(() => CONFIG.genesys.settings.defaultDifficulty), pool: state.pool };
	};
	// §#415: a value that is not glyphs is refused, rather than stored and read as the default.
	e2e.expect(
		'#32 J1 #415 the Default Difficulty setting refuses a value that is not glyphs, and keeps the one it held',
		{ glyphs: await defaultDifficulty('DDD'), text: await defaultDifficulty('xyz') },
		{ glyphs: { refused: false, applied: 'DDD', pool: '|DDD' }, text: { refused: true, applied: 'DDD', pool: '|DDD' } },
	);
	await setSetting('defaultDifficulty', 'DD');
	const skillsCompendium = async (value: string) => {
		await gm.evaluate(() => window.dicePromptE2E.clearNotifications());
		await setSetting('skillsCompendium', value);
		await e2e.settle();
		return gm.evaluate(() => ({
			compendium: CONFIG.genesys.settings.skillsCompendium,
			skills: CONFIG.genesys.skills.length,
			notifications: window.dicePromptE2E.notifications(),
		}));
	};
	e2e.expect(
		'#100 J2 an empty Skills Compendium setting warns and loads the default one, a missing one is an error',
		{
			empty: await skillsCompendium(''),
			missing: await skillsCompendium('world.e2e-missing'),
			default: await skillsCompendium('genesys.crb-skills'),
		},
		{
			empty: {
				compendium: 'genesys.crb-skills',
				skills: 37,
				notifications: ['warning: Skills compendium setting is empty! Attempting to use default skills compendium.'],
			},
			missing: {
				compendium: 'world.e2e-missing',
				skills: 0,
				notifications: [
					"error: Unable to load Skills Compendium 'world.e2e-missing'. Reconfigure the skills compendium in Genesys Settings.",
				],
			},
			default: { compendium: 'genesys.crb-skills', skills: 37, notifications: [] },
		},
	);
	await gm.evaluate(() => window.dicePromptE2E.createSkillsPack());
	await setSetting('skillsCompendium', 'world.e2e-skills');
	await e2e.settle();
	await gm.evaluate(() => window.dicePromptE2E.renameSkill('E2E Lore Renamed'));
	const renamed = await opened(gm, skillRoll('Cool'));
	e2e.expect(
		'#100 J3 a skill renamed in a world Skills Compendium shows its new name in the prompt without a reload',
		{
			skills: await gm.evaluate(() => CONFIG.genesys.skills.map((skill: { name: string }) => skill.name)),
			unranked: renamed.skills?.Unranked,
		},
		{ skills: ['E2E Lore Renamed'], unranked: ['E2E Lore Renamed (Int)'] },
	);
	await gm.evaluate(() => window.dicePromptE2E.closePrompts());
	await setSetting('skillsCompendium', 'genesys.crb-skills');
	await gm.evaluate(() => game.packs.get('world.e2e-skills')?.deleteCompendium());
	await e2e.step('J end');
}
