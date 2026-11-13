import type { ConfirmDialog } from '../../page.ts';
import type { ScenarioContext } from '../../scenario.ts';
import type { Evaluate } from './shared.ts';

/** §#373: each delete from a row of the Skills tab, an adversary's skills, the Critical Injuries and the character's header asks first. */
export async function confirmedRemovals(e2e: ScenarioContext, page: Evaluate) {
	const D = 'Doubter';
	const W = 'Wary';
	// The system's deletion dialog, which replaced Foundry's (#577).
	const deletion = (name: string) => ({
		application: 'DialogV2',
		title: 'Confirm Deletion',
		content: `Delete ${name}? This can't be undone.`,
		buttons: ['yes', 'no'],
		defaultButton: 'no',
	});
	const held = async (actor: string, type: string, name: string) =>
		page(
			(args) =>
				game.actors
					.getName(`E2E ${args.actor}`)
					.items.filter((item: { type: string; name: string }) => item.type === args.type && item.name === args.name).length,
			{ actor, type, name },
		);
	// Deletes the rival's Survival, the character's Cool or its Sprain from its row, and answers the dialog; the dialog read.
	const deleteFromRow = (row: 'adversarySkill' | 'skill' | 'injury', answer: 'yes' | 'no') =>
		page(
			async (args) => {
				if (args.row === 'injury') await window.characterE2E.trashInjury(args.D, 'Sprain');
				else if (args.row === 'skill') await window.characterE2E.menu(args.D, { skill: 'Cool' }, 'Genesys.Labels.Delete');
				else await window.characterE2E.menu(args.W, { adversarySkill: 'Survival' }, 'Genesys.Labels.Delete');
				return window.e2e.answerConfirm(args.answer);
			},
			{ row, answer, D, W },
		);
	const granted = () =>
		page(
			(name) => ({
				brawn: window.characterE2E.characteristic(name, 'brawn').base,
				thresholds: window.characterE2E.thresholds(name),
				journal: window.characterE2E.journal(name),
				items: window.characterE2E.grants(name),
				athletics: window.characterE2E.skills(name, ['Athletics']).Athletics?.rank,
			}),
			D,
		);
	const careerSkills = async () =>
		Object.fromEntries(
			Object.entries(await page((name) => window.characterE2E.skills(name, ['Ranged', 'Cool', 'Charm']), D)).map(([name, skill]) => [
				name,
				skill && `${skill.career ? 'career' : 'non-career'} ${skill.rank}`,
			]),
		);

	await e2e.step(
		'#373 A1 a character with an Archetype, a Career, a Critical Injury, and a rival with a skill, their sheets open',
		async () => {
			await page((name) => window.characterE2E.create(name), D);
			await page((name) => window.characterE2E.open(name), D);
			await page((name) => window.characterE2E.applyArchetype(name, 'Archetype'), D);
			await e2e.settle();
			await page((name) => window.characterE2E.drop(name, window.characterE2E.worldItem('Career')), D);
			await page((name) => window.characterE2E.careerPrompt(name, ['Ranged', 'Cool', 'Stealth', 'Perception']), D);
			await page((args) => window.characterE2E.createItems(args.name, args.items), {
				name: D,
				items: [{ name: 'E2E Sprain', type: 'injury', system: { severity: 'easy' } }],
			});
			await page((name) => window.characterE2E.create(name, 'rival'), W);
			await page((args) => window.characterE2E.createItems(args.name, args.items), {
				name: W,
				items: [{ name: 'Survival', type: 'skill', system: { category: 'general', characteristic: 'cunning' } }],
			});
			await page((name) => window.characterE2E.open(name), W);
		},
	);

	let asked: ConfirmDialog | null = null;
	await e2e.step("#373 A2 the Delete of the rival's skill Survival clicked, and No answered", async () => {
		asked = await deleteFromRow('adversarySkill', 'no');
	});
	e2e.expect(
		"#373 A2 an adversary skill's Delete asks in Foundry's deletion dialog, which names the skill, No by default, and No keeps it",
		{ asked, held: await held(W, 'skill', 'Survival') },
		{ asked: deletion('Survival'), held: 1 },
	);
	await e2e.step("#373 A3 the Delete of the rival's skill Survival clicked, and Yes answered", async () => {
		await deleteFromRow('adversarySkill', 'yes');
	});
	e2e.expect("#373 A3 Yes deletes the adversary's skill", await held(W, 'skill', 'Survival'), 0);

	await e2e.step("#373 B1 the Delete of the character's skill Cool clicked, and No answered", async () => {
		asked = await deleteFromRow('skill', 'no');
	});
	e2e.expect(
		"#373 B1 a character skill's Delete asks in Foundry's deletion dialog, which names the skill, No by default, and No keeps it",
		{ asked, held: await held(D, 'skill', 'Cool') },
		{ asked: deletion('Cool'), held: 1 },
	);
	await e2e.step("#373 B2 the Delete of the character's skill Cool clicked, and Yes answered", async () => {
		await deleteFromRow('skill', 'yes');
	});
	e2e.expect("#373 B2 Yes deletes the character's skill", await held(D, 'skill', 'Cool'), 0);

	await e2e.step('#373 C1 the trash icon of the Critical Injury Sprain clicked, and No answered', async () => {
		asked = await deleteFromRow('injury', 'no');
	});
	e2e.expect(
		"#373 C1 a Critical Injury's trash icon asks in Foundry's deletion dialog, which names the injury, No by default, and No keeps it",
		{ asked, held: await held(D, 'injury', 'E2E Sprain') },
		{ asked: deletion('E2E Sprain'), held: 1 },
	);
	await e2e.step('#373 C2 the trash icon of the Critical Injury Sprain clicked, and Yes answered', async () => {
		await deleteFromRow('injury', 'yes');
	});
	e2e.expect('#373 C2 Yes deletes the Critical Injury', await held(D, 'injury', 'E2E Sprain'), 0);

	const careerMenu = () => page((name) => window.characterE2E.menu(name, { meta: 'career' }), D);
	const journal = () => page((name) => window.characterE2E.journal(name), D);
	const withStartingXP = await journal();
	await e2e.step('#436 A1 a rank of the career skill Ranged bought', async () => {
		await page((name) => window.characterE2E.buySkill(name, 'Ranged'), D);
		await e2e.settle();
	});
	e2e.expect(
		"#436 A1 once a skill rank is bought, the Career's menu offers no Delete, as its drop is refused",
		{ journal: await journal(), menu: await careerMenu() },
		{ journal: [...withStartingXP, 'Skill -10 Ranged 2'], menu: ['Edit'] },
	);
	await e2e.step("#436 A2 the skill rank's entry undone from the Experience Journal", async () => {
		await page(async (name) => {
			await window.characterE2E.undo(name, 'Skill');
			// The build may ask before undoing (#432): Yes undoes the entry.
			await window.e2e.answerConfirm('yes');
		}, D);
		await e2e.settle();
	});
	e2e.expect(
		"#436 A2 once the skill rank's entry is undone, the Career's menu offers Delete again",
		{ journal: await journal(), menu: await careerMenu() },
		{ journal: withStartingXP, menu: ['Edit', 'Delete'] },
	);

	const withArchetype = await granted();
	await e2e.step("#373 D1 the Archetype's Delete clicked, and No answered", async () => {
		asked = await page((name) => window.characterE2E.removeArchetype(name, 'no'), D);
	});
	e2e.expect(
		'#373 D1 removing the Archetype asks in a dialog saying what it takes back, No by default, and No keeps all it gave',
		{ asked, granted: await granted() },
		{
			asked: {
				application: 'DialogV2',
				title: 'Remove Archetype',
				content:
					'Removing E2E Archetype takes back the characteristics, wound and strain thresholds and Starting XP it gave, deletes the items it granted, and lowers each skill it granted by one rank. Do you want to proceed?',
				buttons: ['yes', 'no'],
				defaultButton: 'no',
			},
			granted: withArchetype,
		},
	);
	await e2e.step("#373 D2 the Archetype's Delete clicked, and Yes answered", async () => {
		await page((name) => window.characterE2E.removeArchetype(name, 'yes'), D);
	});
	e2e.expect('#373 D2 Yes takes back all the Archetype gave', await granted(), {
		brawn: 0,
		thresholds: { wounds: 0, strain: 0 },
		journal: [],
		items: ['career:E2E Career:none'],
		athletics: 0,
	});

	const withCareer = await careerSkills();
	await e2e.step("#373 E1 the Career's Delete clicked, and No answered", async () => {
		asked = await page((name) => window.characterE2E.removeCareer(name, 'no'), D);
	});
	e2e.expect(
		'#373 E1 removing the Career asks in a dialog saying what it takes back, No by default, and No keeps its skills marked and their Free Ranks',
		{ asked, skills: await careerSkills(), held: await held(D, 'career', 'E2E Career') },
		{
			asked: {
				application: 'DialogV2',
				title: 'Remove Career',
				content:
					'Removing E2E Career unmarks its career skills and takes back the Free Ranks it gave them. Do you want to proceed?',
				buttons: ['yes', 'no'],
				defaultButton: 'no',
			},
			skills: withCareer,
			held: 1,
		},
	);
	await e2e.step("#373 E2 the Career's Delete clicked, and Yes answered", async () => {
		await page((name) => window.characterE2E.removeCareer(name, 'yes'), D);
	});
	e2e.expect(
		'#373 E2 Yes deletes the Career, unmarks its skills and takes back their Free Ranks',
		{ skills: await careerSkills(), held: await held(D, 'career', 'E2E Career') },
		{ skills: { Ranged: 'non-career 0', Cool: null, Charm: 'non-career 0' }, held: 0 },
	);

	await page(
		async (names) => {
			for (const name of names) await window.characterE2E.close(name);
		},
		[D, W],
	);
}
