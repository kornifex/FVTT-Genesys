import type { ScenarioContext } from '../../scenario.ts';
import type { Evaluate } from './shared.ts';

/**
 * §#924: an Archetype with non-career skill choices, as the Human's two (RoT p. 61), asks for that many different
 * non-career skills when dropped, gives each a rank, and takes the ranks back when it is replaced or removed.
 */
export async function nonCareerSkillChoices(e2e: ScenarioContext, page: Evaluate) {
	const H = 'Human Hero';
	const L = 'Late Career';
	const skills = (actor: string, names: string[]) => page((args) => window.characterE2E.skills(args.actor, args.names), { actor, names });
	const ranks = async (actor: string, names: string[]) =>
		Object.fromEntries(Object.entries(await skills(actor, names)).map(([name, skill]) => [name, skill?.rank ?? null]));
	const label = (key: string) => page((key) => game.i18n.localize(key), key);
	const dropArchetype = (actor: string, archetype: string) =>
		page((args) => window.characterE2E.drop(args.actor, window.characterE2E.worldItem(args.archetype)), { actor, archetype });
	// The skill window as it opens, or null when none opens: a build without the choices drops the Archetype at once.
	const prompt = () =>
		page(async () => {
			const { apps, text, waitFor } = window.e2e;
			const open = () => apps('app-career-skill-prompt').find((app: { rendered: boolean }) => app.rendered);
			try {
				await waitFor('the skill window', () => open()?.element?.querySelector('.career-skill-prompt .select-skill'), 5000);
			} catch {
				// No window opened, as expected of a build without the choices.
				return null;
			}
			const root = open().element as HTMLElement;
			return {
				title: text(root.querySelector('.window-title')),
				hint: text(root.querySelector('.career-skills-hint')),
				remaining: text(root.querySelector('.remaining')),
				skills: [...root.querySelectorAll('.select-skill span')].map((span) => text(span).replace(/ \([^()]*\)$/, '')),
			};
		}, undefined);
	const pick = (picks: string[]) =>
		page((picks) => (window.e2e.apps('app-career-skill-prompt').length ? window.characterE2E.pickFreeRanks(picks) : null), picks);
	const closePrompt = () =>
		page(async () => {
			for (const app of window.e2e.apps('app-career-skill-prompt')) await app.close();
		}, undefined);
	// The character's Archetype, and the names of the skills chosen for it.
	const archetypeOf = (actor: string) =>
		page((name) => {
			const character = game.actors.getName(`E2E ${name}`);
			const archetype = character.items.find((item: { type: string }) => item.type === 'archetype');
			if (!archetype) return null;
			const chosen: string[] = archetype.system.chosenSkillIds ?? [];
			return { name: archetype.name, chosen: chosen.map((id) => character.items.get(id)?.name ?? id) };
		}, actor);
	const held = (actor: string, archetype: string) =>
		page(
			(args) =>
				window.e2e.waitFor(
					`the Archetype ${args.archetype} on E2E ${args.actor}`,
					() =>
						game.actors
							.getName(`E2E ${args.actor}`)
							.items.some(
								(item: { type: string; name: string }) =>
									item.type === 'archetype' && item.name === `E2E ${args.archetype}`,
							),
					20_000,
				),
			{ actor, archetype },
		);
	// The Human of RoT p. 61, whose choices the GM sets on its sheet; the Other Human holds them from its creation.
	const human = (name: string, nonCareerSkillChoices: number) => ({
		name: `E2E ${name}`,
		type: 'archetype',
		system: {
			characteristics: { brawn: 2, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2 },
			woundThreshold: 10,
			strainThreshold: 10,
			startingXP: 110,
			grantedItems: [],
			nonCareerSkillChoices,
		},
	});

	await e2e.step("#924 N1 GM sets the Human's non-career skill choices to 2 on its sheet", async () => {
		await page((items) => Item.createDocuments(items), [human('Human', 0), human('Other Human', 2)]);
		await page(async () => {
			const { render, settle } = window.e2e;
			const item = game.items.getName('E2E Human');
			const root = await render(item.sheet, (root) => root.querySelector('input[name="system.startingXP"]'));
			// A build without the choices shows no field for them.
			const input = root.querySelector<HTMLInputElement>('input[name="system.nonCareerSkillChoices"]');
			if (input) {
				input.value = '2';
				input.dispatchEvent(new Event('change', { bubbles: true }));
				await settle();
			}
			await item.sheet.close();
		}, undefined);
	});
	e2e.expect(
		"#924 N1 the Archetype's sheet stores its number of non-career skill choices",
		await page(() => game.items.getName('E2E Human').system.nonCareerSkillChoices ?? null, undefined),
		2,
	);

	await e2e.step(
		'#924 N2 a character with a Career, Athletics marked by hand and an ability making Arcana a career skill, the Human dropped',
		async () => {
			await page(async (name) => {
				await window.characterE2E.create(name);
				await window.characterE2E.createItems(name, [
					{
						name: 'E2E Arcane Gift',
						type: 'ability',
						effects: [
							{
								name: 'E2E Arcane Gift',
								transfer: true,
								system: { changes: [{ key: 'genesys.careerSkill.Arcana', type: 'custom', value: '' }] },
							},
						],
					},
				]);
				await game.actors.getName(`E2E ${name}`).items.getName('Athletics').update({ 'system.career': true });
				await window.characterE2E.open(name);
				window.characterE2E.drop(name, window.characterE2E.worldItem('Career'));
			}, H);
			await page((name) => window.characterE2E.careerPrompt(name, null), H);
			await dropArchetype(H, 'Human');
		},
	);
	const careerOnes = ['Ranged', 'Cool', 'Stealth', 'Perception', 'Charm', 'Athletics', 'Arcana'];
	const opened = await prompt();
	e2e.expect(
		"#924 N2 the window asks for 2 skills with the Archetype's title and hint, leaving out the Career's, the hand-marked and the effect's career skills",
		opened && {
			title: opened.title,
			hint: opened.hint,
			remaining: opened.remaining,
			careerSkillsOffered: opened.skills.filter((skill) => careerOnes.includes(skill)),
			offersBrawlAndDeception: opened.skills.includes('Brawl') && opened.skills.includes('Deception'),
		},
		{
			title: await label('Genesys.CareerSkillPrompt.NonCareerTitle'),
			hint: await label('Genesys.CareerSkillPrompt.NonCareerHint'),
			remaining: `${await label('Genesys.CareerSkillPrompt.RemainingChoices')}: 2`,
			careerSkillsOffered: [],
			offersBrawlAndDeception: true,
		},
	);

	await e2e.step('#924 N3 Brawl and Deception chosen', async () => {
		await pick(['Brawl', 'Deception']);
		await held(H, 'Human');
		await page((name) => window.e2e.showTab(name, 'skills'), H);
	});
	e2e.expect(
		'#924 N3 each chosen skill gains a rank, and the Archetype keeps them',
		{ ranks: await ranks(H, ['Brawl', 'Deception']), archetype: await archetypeOf(H) },
		{ ranks: { Brawl: 1, Deception: 1 }, archetype: { name: 'E2E Human', chosen: ['Brawl', 'Deception'] } },
	);

	await e2e.step('#924 N4 the Archetype replaced by another with choices, Deception and Survival chosen', async () => {
		await dropArchetype(H, 'Other Human');
		await prompt();
		await pick(['Deception', 'Survival']);
		await held(H, 'Other Human');
	});
	e2e.expect(
		"#924 N4 replacing the Archetype asks again and takes back the held one's ranks",
		await ranks(H, ['Brawl', 'Deception', 'Survival']),
		{ Brawl: 0, Deception: 1, Survival: 1 },
	);

	await e2e.step('#924 N5 the Archetype replaced by one without choices', async () => {
		await page((name) => window.characterE2E.applyArchetype(name, 'Plain Archetype'), H);
	});
	e2e.expect(
		'#924 N5 an Archetype without choices asks nothing, and the chosen ranks are taken back',
		{
			prompts: await page(() => window.e2e.apps('app-career-skill-prompt').length, undefined),
			ranks: await ranks(H, ['Deception', 'Survival']),
		},
		{ prompts: 0, ranks: { Deception: 0, Survival: 0 } },
	);

	await e2e.step('#924 N6 the Human dropped, and its window closed', async () => {
		await dropArchetype(H, 'Human');
		await prompt();
		await closePrompt();
		await held(H, 'Human');
	});
	e2e.expect(
		'#924 N6 closing the window drops the Archetype without chosen skills',
		{ ranks: await ranks(H, ['Brawl', 'Deception']), archetype: await archetypeOf(H) },
		{ ranks: { Brawl: 0, Deception: 0 }, archetype: { name: 'E2E Human', chosen: [] } },
	);

	await e2e.step('#924 N7 the Other Human dropped with Brawl and Deception chosen, then removed', async () => {
		await dropArchetype(H, 'Other Human');
		await prompt();
		await pick(['Brawl', 'Deception']);
		await held(H, 'Other Human');
		await page((name) => window.characterE2E.removeArchetype(name), H);
	});
	e2e.expect('#924 N7 removing the Archetype takes the chosen ranks back', await ranks(H, ['Brawl', 'Deception']), {
		Brawl: 0,
		Deception: 0,
	});

	await e2e.step(
		'#924 N8 a character without a Career takes the Human with Ranged and Brawl, then the Ranger, which lists Ranged',
		async () => {
			await page(async (name) => {
				await window.characterE2E.create(name);
				await window.characterE2E.open(name);
			}, L);
			await dropArchetype(L, 'Human');
			await prompt();
			await pick(['Ranged', 'Brawl']);
			await held(L, 'Human');
			await page((name) => window.characterE2E.drop(name, window.characterE2E.worldItem('Ranger')), L);
			await page((name) => window.characterE2E.careerPrompt(name, null), L);
			await page((name) => window.e2e.showTab(name, 'skills'), L);
		},
	);
	e2e.expect(
		'#924 N8 the Career is accepted: Ranged keeps its rank and becomes a career skill, Brawl stays a non-career skill',
		await skills(L, ['Ranged', 'Brawl']),
		{
			Ranged: { rank: 1, career: true, star: true, canBuy: true },
			Brawl: { rank: 1, career: false, star: false, canBuy: true },
		},
	);

	await e2e.step('#924 N9 Ranged bought to rank 2', async () => {
		await page((name) => window.characterE2E.buySkill(name, 'Ranged'), L);
		await e2e.settle();
	});
	// Character Creation caps bought ranks at 2, Free Ranks included (CRB p. 44).
	e2e.expect('#924 N9 a skill at rank 2 can no longer be bought during Character Creation', (await skills(L, ['Ranged'])).Ranged, {
		rank: 2,
		career: true,
		star: true,
		canBuy: false,
	});

	await page(
		async (names) => {
			for (const name of names) await window.characterE2E.close(name);
		},
		[H, L],
	);
}
