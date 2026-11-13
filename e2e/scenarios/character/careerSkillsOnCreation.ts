import type { ScenarioContext } from '../../scenario.ts';
import type { Evaluate } from './shared.ts';

/** §#199: a skill added to a character whose Career lists it is a career skill. */
export async function careerSkillsOnCreation(e2e: ScenarioContext, page: Evaluate) {
	const H = 'Hunter';
	const skill = async (actor: string, name: string) =>
		(await page((args) => window.characterE2E.skills(args.actor, [args.name]), { actor, name }))[name];
	const career = (actor: string, name: string) =>
		page(
			(args) =>
				game.actors
					.getName(`E2E ${args.actor}`)
					.items.find((item: { type: string; name: string }) => item.type === 'skill' && item.name === args.name)?.system
					.career ?? null,
			{ actor, name },
		);
	const deleteSkill = (actor: string, name: string) =>
		page((args) => game.actors.getName(`E2E ${args.actor}`).items.getName(args.name).delete(), { actor, name });
	const dropSkill = (actor: string, name: string) =>
		page((args) => window.characterE2E.drop(args.actor, window.characterE2E.compendiumSkill(args.name)), { actor, name });
	const skillSource = (name: string) =>
		page((name) => {
			const { _id, ...source } = CONFIG.genesys.skills.find((skill: { name: string }) => skill.name === name).toObject();
			return source;
		}, name);
	const worldSource = (name: string) =>
		page((name) => {
			const { _id, ...source } = game.items.getName(`E2E ${name}`).toObject();
			return source;
		}, name);

	await e2e.step(
		'#199 H1 a character with a Career listing Ranged, which then drops Ranged again from the Skills Compendium',
		async () => {
			await page((name) => window.characterE2E.create(name), H);
			await page((name) => window.characterE2E.open(name), H);
			await page((name) => window.characterE2E.applyArchetype(name, 'Plain Archetype'), H);
			await e2e.settle();
			await page((name) => window.characterE2E.drop(name, window.characterE2E.worldItem('Ranger')), H);
			await page((name) => window.characterE2E.careerPrompt(name, null), H);
			await e2e.settle();
			await deleteSkill(H, 'Ranged');
			await e2e.settle();
			await dropSkill(H, 'Ranged');
		},
	);
	e2e.expect('#199 H1 a skill the Career lists, dropped from the Skills Compendium, is a career skill', await skill(H, 'Ranged'), {
		rank: 0,
		career: true,
		star: true,
		canBuy: true,
	});
	await e2e.step('#199 H2 Ranged rank 1 bought', () => page((name) => window.characterE2E.buySkill(name, 'Ranged'), H));
	e2e.expect('#199 H2 its rank 1 costs 5 XP', await page((name) => window.characterE2E.journal(name).slice(-1), H), [
		'Skill -5 Ranged 1',
	]);
	await e2e.step('#199 H3 Stealth, which the Career lists, created by a macro; Cool, which it does not, dropped', async () => {
		await deleteSkill(H, 'Stealth');
		await deleteSkill(H, 'Cool');
		await e2e.settle();
		await page((data) => window.characterE2E.createItems('Hunter', [data]), await skillSource('Stealth'));
		await dropSkill(H, 'Cool');
	});
	e2e.expect(
		'#199 H3 a skill created by a macro is a career skill when the Career lists it; one it does not list keeps its source value',
		{ stealth: await skill(H, 'Stealth'), cool: await skill(H, 'Cool') },
		{ stealth: { rank: 0, career: true, star: true, canBuy: true }, cool: { rank: 0, career: false, star: false, canBuy: true } },
	);
	await e2e.step('#199 H4 a skill the Career does not list, created as a career skill', () =>
		page(
			(items) => window.characterE2E.createItems('Hunter', items),
			[{ name: 'E2E Lore', type: 'skill', system: { category: 'knowledge', characteristic: 'intellect', career: true } }],
		),
	);
	e2e.expect('#199 H4 a skill created as a career skill stays one', await career(H, 'E2E Lore'), true);
	await e2e.step("#199 H5 Ranged's rank undone, then the Career removed", async () => {
		// The Career can only be removed until a skill rank is bought (#436).
		await page(async (name) => {
			await window.characterE2E.undo(name, 'Skill');
			// The build may ask before undoing (#432): Yes undoes the entry.
			await window.e2e.answerConfirm('yes');
		}, H);
		await e2e.settle();
		await page((name) => window.characterE2E.removeCareer(name), H);
	});
	e2e.expect('#199 H5 removing the Career unmarks the dropped skill', await career(H, 'Ranged'), false);
	await page((name) => window.characterE2E.close(name), H);

	await e2e.step('#199 H6 a character created with a Career and Ranged, and Ranged created with a Career on another', async () => {
		const ranger = await worldSource('Ranger');
		await page((items) => window.characterE2E.create('Imported', 'character', items), [ranger, await skillSource('Ranged')]);
		await page((name) => window.characterE2E.create(name), 'Batch');
		await deleteSkill('Batch', 'Ranged');
		await e2e.settle();
		await page((items) => window.characterE2E.createItems('Batch', items), [ranger, await skillSource('Ranged')]);
	});
	e2e.expect(
		'#199 H6 a skill created with its actor, or in the same batch as the Career, keeps its source value',
		{ imported: await career('Imported', 'Ranged'), batch: await career('Batch', 'Ranged') },
		{ imported: false, batch: false },
	);
	await e2e.step('#199 H7 Ranged dropped on a rival, and Survival created on a rival holding a Career', async () => {
		await page((name) => window.characterE2E.create(name, 'rival'), 'Rival');
		await page((name) => window.characterE2E.open(name), 'Rival');
		await dropSkill('Rival', 'Ranged');
		await page((items) => window.characterE2E.createItems('Rival', items), [await worldSource('Ranger')]);
		await e2e.settle();
		await page((items) => window.characterE2E.createItems('Rival', items), [await skillSource('Survival')]);
	});
	e2e.expect(
		"#199 H7 a rival's skills are no career skills",
		{ ranged: await career('Rival', 'Ranged'), survival: await career('Rival', 'Survival') },
		{ ranged: false, survival: false },
	);
	await e2e.step('#199 H8 Ranged dropped on a vehicle, and Survival created on a vehicle holding a Career', async () => {
		await page((name) => window.characterE2E.create(name, 'vehicle'), 'Hauler');
		await page((name) => window.characterE2E.open(name), 'Hauler');
		await dropSkill('Hauler', 'Ranged');
		await page((items) => window.characterE2E.createItems('Hauler', items), [await worldSource('Ranger')]);
		await e2e.settle();
		await page((items) => window.characterE2E.createItems('Hauler', items), [await skillSource('Survival')]);
	});
	// The vehicle sheet takes no skill by drop: a skill reaches a vehicle only through a macro.
	e2e.expect(
		"#199 H8 a vehicle's skills are no career skills",
		{ ranged: await career('Hauler', 'Ranged'), survival: await career('Hauler', 'Survival') },
		{ ranged: null, survival: false },
	);
	await page((name) => window.characterE2E.close(name), 'Hauler');
}
