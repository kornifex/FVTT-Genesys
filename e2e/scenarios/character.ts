/** @file The character items of the test checklist: Advancement and the Experience Journal, Archetype, Career, the Talent Pyramid, talents, characteristics, super-characteristics, the Skills tab, Critical Injuries, expanded descriptions and a weapon's Weapon Profiles. */
import type { ScenarioContext } from '../scenario.ts';
import { SETTINGS, installCharacterHelpers } from './character/shared.ts';
import { weaponProfiles } from './character/weaponProfiles.ts';
import { archetypes } from './character/archetypes.ts';
import { advancement } from './character/advancement.ts';
import { careers } from './character/careers.ts';
import { careerSkillsOnCreation } from './character/careerSkillsOnCreation.ts';
import { superCharacteristics } from './character/superCharacteristics.ts';
import { skillsTab } from './character/skillsTab.ts';
import { skillMenus } from './character/skillMenus.ts';
import { talentPyramidSummary } from './character/talentPyramidSummary.ts';
import { talentRanks } from './character/talentRanks.ts';
import { talentTokenChanges } from './character/talentTokenChanges.ts';
import { talentsTab } from './character/talentsTab.ts';
import { injuries } from './character/injuries.ts';
import { expandedDescriptions } from './character/expandedDescriptions.ts';
import { combatRowDescriptions } from './character/combatRowDescriptions.ts';
import { talentRowDescriptions } from './character/talentRowDescriptions.ts';
import { skillIcons } from './character/skillIcons.ts';
import { talentTiers } from './character/talentTiers.ts';
import { folds } from './character/folds.ts';
import { confirmedRemovals } from './character/confirmedRemovals.ts';

export async function run(e2e: ScenarioContext) {
	const { gm } = e2e;
	// Runs a function in the GM's page with its argument, typed as the function takes it.
	const page = <A, R>(fn: (arg: A) => R | Promise<R>, arg: A) => (gm.evaluate as (fn: unknown, arg: unknown) => Promise<R>)(fn, arg);
	await gm.evaluate(installCharacterHelpers);
	const saved = await gm.evaluate((keys) => window.e2e.settings(keys), SETTINGS);
	const notified = (key: string, data?: Record<string, unknown>) =>
		page((args) => `info: ${window.characterE2E.format(args.key, args.data)}`, { key, data });
	const notifications = () => gm.evaluate(() => window.characterE2E.notifications());

	try {
		await e2e.step('setup', async () => {
			await gm.evaluate(() => window.characterE2E.setUp());
			await gm.evaluate(() =>
				window.e2e.setSettings({
					useSuperCharacteristics: false,
					ignoreTalentPyramid: false,
					talentTierVersions: false,
					careerSkillRanks: 4,
					skillForInjuries: 'Resilience',
					skillForRepairingVehicleHits: 'Mechanics',
				}),
			);
		});

		await e2e.part('archetypes', () => archetypes(e2e, page, notified, notifications));
		await e2e.part('advancement', () => advancement(e2e, page, notified, notifications));
		await e2e.part('careers', () => careers(e2e, page, notified, notifications));
		await e2e.part('careerSkillsOnCreation', () => careerSkillsOnCreation(e2e, page));
		await e2e.part('superCharacteristics', () => superCharacteristics(e2e, page, notifications));
		await e2e.part('skillsTab', () => skillsTab(e2e, page));
		await e2e.part('skillMenus', () => skillMenus(e2e, page));
		await e2e.part('talentPyramidSummary', () => talentPyramidSummary(e2e, page));
		await e2e.part('talentRanks', () => talentRanks(e2e, page));
		// v13 has no token changes. The part is met on every version, so that `--part` finds it on both.
		await e2e.part('talentTokenChanges', async () => {
			if (e2e.version >= 14) await talentTokenChanges(e2e, page);
		});
		await e2e.part('talentsTab', () => talentsTab(e2e, page));
		await e2e.part('injuries', () => injuries(e2e, page));
		await e2e.part('weaponProfiles', () => weaponProfiles(e2e, page));
		await e2e.part('talentTiers', () => talentTiers(e2e, page, notified, notifications));
		await e2e.part('expandedDescriptions', () => expandedDescriptions(e2e, page));
		await e2e.part('combatRowDescriptions', () => combatRowDescriptions(e2e, page));
		await e2e.part('talentRowDescriptions', () => talentRowDescriptions(e2e, page));
		await e2e.part('skillIcons', () => skillIcons(e2e, page));
		await e2e.part('folds', () => folds(e2e, page));
		// Last: on a build that doesn't ask, No deletes at once, and the Yes after it finds nothing to delete.
		await e2e.part('confirmedRemovals', () => confirmedRemovals(e2e, page));
	} finally {
		// The page lost the helpers if a step stopped the scenario after a reload. A failure here is no expected one: it is
		// logged, so that the error which stopped the scenario stays the one reported.
		await gm.evaluate(installCharacterHelpers).catch((error) => e2e.log('cleanup: the helpers could not be installed', String(error)));
		await page((values) => window.e2e.setSettings(values), saved);
		await gm.evaluate(() => window.characterE2E.deletePack());
	}
}
