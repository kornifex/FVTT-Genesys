import type { ScenarioContext } from '../../scenario.ts';
import type { Evaluate } from './shared.ts';

/** §#39, §#431: a Career whose skills differ in case from the character's, removed, replaced, then refused. */
export async function careers(
	e2e: ScenarioContext,
	page: Evaluate,
	notified: (key: string, data?: Record<string, unknown>) => Promise<string>,
	notifications: () => Promise<string[]>,
) {
	const C = 'Careerist';
	const listed = ['Ranged', 'Cool', 'Stealth', 'Perception', 'Charm', 'Brawl', 'Melee', 'Athletics', 'Discipline'];
	const skills = async () => {
		const state = await page((args) => window.characterE2E.skills(args.actor, args.names), { actor: C, names: listed });
		return Object.fromEntries(
			Object.entries(state).map(([name, skill]) => [name, skill && `${skill.career ? 'career' : 'non-career'} ${skill.rank}`]),
		);
	};
	const careerItems = async () => (await page((name) => window.characterE2E.items(name), C)).filter((item) => item.startsWith('career:'));
	const untouched = Object.fromEntries(listed.map((name) => [name, 'non-career 0']));
	const dropCareer = (career: string) =>
		page((args) => window.characterE2E.drop(args.actor, window.characterE2E.worldItem(args.career)), { actor: C, career });
	const prompt = (picks: string[] | null) =>
		page((args) => window.characterE2E.careerPrompt(args.actor, args.picks), { actor: C, picks });

	let offered: string[] = [];
	await e2e.step('#39 G1 a Career naming its skills in another case dropped, and four Free Ranks picked', async () => {
		await page((name) => window.characterE2E.create(name), C);
		await page((name) => window.characterE2E.open(name), C);
		await dropCareer('Career');
		offered = await prompt(['Ranged', 'Cool', 'Stealth', 'Perception']);
	});
	e2e.expect('#39 G1 the Free Rank prompt offers the Career skills whatever their case', [...offered].sort(), [
		'Charm',
		'Cool',
		'Perception',
		'Ranged',
		'Stealth',
	]);
	e2e.expect(
		'#39 G1 the Career marks its skills whatever their case, and gives the picked ones a rank',
		{ skills: await skills(), careers: await careerItems() },
		{
			skills: { ...untouched, Ranged: 'career 1', Cool: 'career 1', Stealth: 'career 1', Perception: 'career 1', Charm: 'career 0' },
			careers: ['career:E2E Career'],
		},
	);
	await e2e.step('#39 G2 the Career deleted from the sheet', () => page((name) => window.characterE2E.removeCareer(name), C));
	e2e.expect(
		'#39 G2 deleting the Career unmarks its skills whatever their case, and takes back their Free Ranks',
		{ skills: await skills(), careers: await careerItems() },
		{
			skills: untouched,
			careers: [],
		},
	);
	await e2e.step('#39 G3 the Career dropped again, then another Career dropped over it', async () => {
		await dropCareer('Career');
		await prompt(['Ranged', 'Cool', 'Stealth', 'Charm']);
		await e2e.settle();
		await dropCareer('Other Career');
		offered = await prompt(['Brawl', 'Melee', 'Athletics', 'Discipline']);
	});
	e2e.expect(
		'#39 G3 a Career dropped over another unmarks the first one skills and takes back their Free Ranks',
		{ skills: await skills(), careers: await careerItems() },
		{
			skills: { ...untouched, Brawl: 'career 1', Melee: 'career 1', Athletics: 'career 1', Discipline: 'career 1' },
			careers: ['career:E2E Other Career'],
		},
	);
	let whilePrompted: { skills: Record<string, string | null>; careers: string[] } | undefined;
	await e2e.step('#254 G4 the first Career dropped back over the other, counting the writes', async () => {
		await e2e.settle();
		await page((name) => window.characterE2E.startCounting(name), C);
		await dropCareer('Career');
		await page(() => window.characterE2E.careerPromptOpen(), undefined);
		whilePrompted = { skills: await skills(), careers: await careerItems() };
		await prompt(['Ranged', 'Cool', 'Stealth', 'Charm']);
		await e2e.settle();
	});
	const careerWrites = await page(() => window.characterE2E.stopCounting(), undefined);
	e2e.expect('#254 G4 nothing is written while the Free Rank prompt is open', whilePrompted, {
		skills: { ...untouched, Brawl: 'career 1', Melee: 'career 1', Athletics: 'career 1', Discipline: 'career 1' },
		careers: ['career:E2E Other Career'],
	});
	e2e.expect(
		'#254 G4 the Career is replaced with its Free Ranks, each skill updated once',
		{
			skills: await skills(),
			careers: await careerItems(),
			writes: {
				createItem: careerWrites.createItem,
				updateItem: careerWrites.updateItem,
				deleteItem: careerWrites.deleteItem,
				updateActor: careerWrites.updateActor,
			},
		},
		{
			skills: { ...untouched, Ranged: 'career 1', Cool: 'career 1', Stealth: 'career 1', Perception: 'career 0', Charm: 'career 1' },
			careers: ['career:E2E Career'],
			// The four skills the Other Career lists and the five the Career lists; the Career is created with its Free Ranks.
			writes: { createItem: 1, updateItem: 9, deleteItem: 1, updateActor: 0 },
		},
	);

	const journal = () => page((name) => window.characterE2E.journal(name), C);
	const prompts = () => page(() => window.e2e.apps('app-career-skill-prompt').length, undefined);
	await e2e.step('#431 G1 another Career dropped once a skill rank is bought', async () => {
		await page((name) => window.characterE2E.applyArchetype(name, 'Plain Archetype'), C);
		await e2e.settle();
		await page((name) => window.characterE2E.buySkill(name, 'Ranged'), C);
		await e2e.settle();
		await notifications();
		await dropCareer('Other Career');
	});
	const trained = { ...untouched, Ranged: 'career 2', Cool: 'career 1', Stealth: 'career 1', Perception: 'career 0', Charm: 'career 1' };
	e2e.expect(
		'#431 G1 the Career is refused before any prompt, with a notification that says to undo the skill ranks bought',
		{
			skills: await skills(),
			careers: await careerItems(),
			journal: await journal(),
			prompts: await prompts(),
			notifications: await notifications(),
		},
		{
			skills: trained,
			careers: ['career:E2E Career'],
			journal: ['Starting 1000', 'Skill -10 Ranged 2'],
			prompts: 0,
			notifications: [await notified('Genesys.Notifications.CannotReplaceCareer', { name: 'E2E Other Career' })],
		},
	);
	await e2e.step('#431 G2 a skill the character owns dropped again from the Skills Compendium', () =>
		page((name) => window.characterE2E.drop(name, window.characterE2E.compendiumSkill('Ranged')), C),
	);
	e2e.expect(
		'#431 G2 the skill the character owns is still refused without a notification',
		{
			skills: await skills(),
			ranged: await page(
				(name) =>
					game.actors
						.getName(`E2E ${name}`)
						.items.filter((item: { type: string; name: string }) => item.type === 'skill' && item.name === 'Ranged').length,
				C,
			),
			notifications: await notifications(),
		},
		{ skills: trained, ranged: 1, notifications: [] },
	);
	await page((name) => window.characterE2E.close(name), C);

	// §#254: the Career is decided again once its Free Ranks are chosen, since the character may change meanwhile, as when
	// another user, or a script, buys a skill rank.
	const H = 'Hesitant';
	const hesitant = async () => ({
		skills: Object.fromEntries(
			Object.entries(await page((args) => window.characterE2E.skills(args.actor, args.names), { actor: H, names: listed })).map(
				([name, skill]) => [name, skill && `${skill.career ? 'career' : 'non-career'} ${skill.rank}`],
			),
		),
		careers: (await page((name) => window.characterE2E.items(name), H)).filter((item) => item.startsWith('career:')),
		journal: await page((name) => window.characterE2E.journal(name), H),
		prompts: await prompts(),
		notifications: await notifications(),
	});
	let bought = false;
	await e2e.step(
		'#254 G5 a Career dropped, a skill rank bought from the sheet while its Free Rank prompt is open, then four Free Ranks picked',
		async () => {
			await page((name) => window.characterE2E.create(name), H);
			await page((name) => window.characterE2E.open(name), H);
			await page((name) => window.characterE2E.applyArchetype(name, 'Plain Archetype'), H);
			await e2e.settle();
			await notifications();
			await page((name) => window.characterE2E.drop(name, window.characterE2E.worldItem('Career')), H);
			await page(() => window.characterE2E.careerPromptOpen(), undefined);
			bought = await page((name) => window.characterE2E.buySkill(name, 'Brawl'), H);
			await e2e.settle();
			await page(() => window.characterE2E.pickFreeRanks(['Ranged', 'Cool', 'Stealth', 'Charm']), undefined);
		},
	);
	e2e.expect(
		'#254 G5 a skill rank bought while the Free Rank prompt is open makes the Career refused once the Free Ranks are chosen',
		{ bought, ...(await hesitant()) },
		{
			bought: true,
			skills: { ...untouched, Brawl: 'non-career 1' },
			careers: [],
			journal: ['Starting 1000', 'Skill -10 Brawl 1'],
			prompts: 0,
			notifications: [await notified('Genesys.Notifications.CannotReplaceCareer', { name: 'E2E Career' })],
		},
	);

	// §#254: Foundry's own drop handler resolves what a drop on an actor's sheet carries, and logs an error when the item
	// a link names is gone.
	const heldBefore = await page((name) => window.characterE2E.items(name), H);
	let dropErrors: string[] = [];
	await e2e.step("#254 P1 a link to a deleted world item dropped on a character's sheet", async () => {
		const errors = e2e.gm.errors.length;
		await page(async (name) => {
			const [gone] = await Item.createDocuments([{ name: 'E2E Gone', type: 'talent', system: { tier: 1 } }]);
			const uuid = gone.uuid;
			await gone.delete();
			window.characterE2E.drop(name, uuid);
		}, H);
		await e2e.settle();
		dropErrors = e2e.gm.errors.slice(errors);
	});
	e2e.expect(
		"#254 P1 a link to a deleted item dropped on an actor's sheet changes nothing, and logs Foundry's error in the console",
		{
			items: await page((name) => window.characterE2E.items(name), H),
			errors: dropErrors.map((error) => /Failed to resolve Document from provided DragData/.test(error)),
		},
		{ items: heldBefore, errors: [true] },
	);
	await page((name) => window.characterE2E.close(name), H);
}
