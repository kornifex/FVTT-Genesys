import type { ScenarioContext } from '../../scenario.ts';
import type { Evaluate } from './shared.ts';

/**
 * §#922: a talent's or an Archetype's Career Skill change makes a skill a career skill while it applies, and an Archetype
 * listing a skill twice grants it 2 ranks (RoT pp. 63, 87).
 */
export async function careerSkillChanges(
	e2e: ScenarioContext,
	page: Evaluate,
	notified: (key: string, data?: Record<string, unknown>) => Promise<string>,
	notifications: () => Promise<string[]>,
) {
	const S = 'Scholar';
	const skills = (names: string[]) => page((args) => window.characterE2E.skills(args.actor, args.names), { actor: S, names });
	const journal = () => page((name) => window.characterE2E.journal(name), S);
	const arcanaMenu = () => page((name) => window.characterE2E.menu(name, { skill: 'Arcana' }), S);
	const label = (key: string, data: Record<string, string> = {}) => page((args) => game.i18n.format(args.key, args.data), { key, data });
	const careerSkillEffect = (name: string, skill: string) => ({
		name: `E2E ${name}`,
		transfer: true,
		system: { changes: [{ key: `genesys.careerSkill.${skill}`, type: 'custom', value: '' }] },
	});

	await e2e.step(
		'#922 C1 Career-Only Magic Skills on, a character with an Archetype and no Career, a talent making Arcana a career skill in the world',
		async () => {
			await page(
				(items) => Item.createDocuments(items),
				[
					{
						name: 'E2E Arcane Study',
						type: 'talent',
						system: { activation: { type: 'passive', detail: '' }, tier: 1 },
						effects: [careerSkillEffect('Arcane Study', 'Arcana')],
					},
					{
						name: 'E2E Deep Archetype',
						type: 'archetype',
						system: {
							characteristics: { brawn: 2, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2 },
							woundThreshold: 10,
							strainThreshold: 10,
							startingXP: 90,
							grantedItems: [
								{ name: 'Knowledge', type: 'skill', system: {} },
								{ name: 'Knowledge', type: 'skill', system: {} },
							],
						},
						effects: [careerSkillEffect('Ynfernael Lore', 'Knowledge')],
					},
				],
			);
			await page(() => window.e2e.setSettings({ careerOnlyMagicSkills: true }), undefined);
			await page((name) => window.characterE2E.create(name), S);
			await page((name) => window.characterE2E.open(name), S);
			await page((name) => window.characterE2E.applyArchetype(name, 'Plain Archetype'), S);
			await page((name) => window.e2e.showTab(name, 'skills'), S);
		},
	);
	e2e.expect('#922 C1 a magic skill nothing makes a career skill has no star and no rank to buy', (await skills(['Arcana'])).Arcana, {
		rank: 0,
		career: false,
		star: false,
		canBuy: false,
	});

	await e2e.step('#922 C2 the talent bought', async () => {
		await page((name) => window.characterE2E.drop(name, window.characterE2E.worldItem('Arcane Study')), S);
		await e2e.settle();
	});
	e2e.expect(
		"#922 C2 the talent's Career Skill change stars Arcana, offers its rank, and its menu names the effect instead of the mark",
		{ arcana: (await skills(['Arcana'])).Arcana, menu: (await arcanaMenu()).slice(0, 2) },
		{
			arcana: { rank: 0, career: false, star: true, canBuy: true },
			menu: [await label('Genesys.Labels.CareerSkillFrom', { effect: 'E2E Arcane Study' }), await label('Genesys.Labels.FreeRankUp')],
		},
	);

	await e2e.step('#922 C3 Arcana rank 1 bought', async () => {
		await page((name) => window.characterE2E.buySkill(name, 'Arcana'), S);
		await e2e.settle();
	});
	e2e.expect('#922 C3 its rank 1 costs the career price, 5 XP', (await journal()).slice(-1), ['Skill -5 Arcana 1']);

	const before = await journal();
	await notifications();
	await e2e.step('#922 C4 the talent undone', async () => {
		await page((name) => window.characterE2E.undo(name, 'NewTalent'), S);
		await e2e.settle();
	});
	e2e.expect(
		'#922 C4 undoing the talent is refused while a later rank of Arcana was bought at the career price it gave',
		{ journal: await journal(), notifications: await notifications() },
		{
			journal: before,
			notifications: [
				await notified('Genesys.Notifications.CannotDeleteCareerSkillTalent', { name: 'E2E Arcane Study', skill: 'Arcana' }),
			],
		},
	);

	await e2e.step("#922 C5 Arcana's rank undone, then the talent", async () => {
		for (const entry of ['Skill', 'NewTalent']) {
			await page(
				async (args) => {
					await window.characterE2E.undo(args.actor, args.entry);
					// The build asks before undoing (#432): Yes undoes the entry.
					await window.e2e.answerConfirm('yes');
				},
				{ actor: S, entry },
			);
			await e2e.settle();
		}
	});
	e2e.expect('#922 C5 once the talent is gone, Arcana is no career skill again', (await skills(['Arcana'])).Arcana, {
		rank: 0,
		career: false,
		star: false,
		canBuy: false,
	});

	await e2e.step('#922 C6 the Archetype replaced by one granting Knowledge twice and making it a career skill', async () => {
		await page((name) => window.characterE2E.applyArchetype(name, 'Deep Archetype'), S);
		await e2e.settle();
	});
	// A third rank can't be bought during Character Creation (CRB p. 44).
	e2e.expect("#922 C6 Knowledge gets 2 Free Ranks and the Archetype's star", (await skills(['Knowledge'])).Knowledge, {
		rank: 2,
		career: false,
		star: true,
		canBuy: false,
	});

	await e2e.step('#922 C7 the Archetype removed', async () => {
		await page((name) => window.characterE2E.removeArchetype(name), S);
		await e2e.settle();
	});
	e2e.expect('#922 C7 removing the Archetype takes both ranks and the star back', (await skills(['Knowledge'])).Knowledge, {
		rank: 0,
		career: false,
		star: false,
		canBuy: false,
	});

	await page(async (name) => {
		await window.characterE2E.close(name);
		await window.e2e.setSettings({ careerOnlyMagicSkills: false });
	}, S);
}
