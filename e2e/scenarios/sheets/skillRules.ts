import type { SheetsContext } from './shared.ts';

export async function skillRulesPart(ctx: SheetsContext) {
	const { e2e, gm } = ctx;
	// What a skill's sheet shows of its Default Difficulty and Initiative, and whether those fields can be edited.
	const skillFields = (owner: string | null, skill: string) =>
		gm.evaluate(
			async ({ owner, skill }) => {
				const item = owner ? game.actors.getName(owner).items.getName(skill) : game.items.getName(skill);
				const root = await window.e2e.render(item.sheet);
				const difficulty = root.querySelector<HTMLInputElement>(
					'input[type="text"][name="system.difficulty"], input[type="text"]:disabled',
				);
				const initiative = root.querySelector<HTMLInputElement>(
					'input[type="checkbox"][name="system.initiative"], input[type="checkbox"]:disabled',
				);
				return {
					difficulty: difficulty?.value,
					difficultyEditable: difficulty ? !difficulty.disabled : null,
					initiative: initiative?.checked,
					initiativeEditable: initiative ? !initiative.disabled : null,
				};
			},
			{ owner, skill },
		);

	await e2e.step(
		"#767 K1 GM gives a character a copy of a Skills Compendium's skill with its own Default Difficulty and Initiative, and a skill the compendium lacks",
		() =>
			gm.evaluate(async () => {
				const defined = CONFIG.genesys.skills[0];
				const character = await Actor.create({ name: 'E2E Skill Rules', type: 'character' });
				await character.createEmbeddedDocuments('Item', [
					{ name: defined.name, type: 'skill', system: { difficulty: 'DDDD', initiative: !defined.system.initiative } },
					{ name: 'E2E Unlisted Skill', type: 'skill', system: { difficulty: 'DDDD', initiative: true } },
				]);
			}),
	);
	const defined = await gm.evaluate(() => {
		const skill = CONFIG.genesys.skills[0];
		return {
			name: skill.name,
			difficulty: skill.system.difficulty || CONFIG.genesys.settings.defaultDifficulty,
			initiative: skill.system.initiative,
		};
	});
	e2e.expect(
		"#767 K1 a character's skill shows the Skills Compendium's Default Difficulty and Initiative, and neither can be edited",
		await skillFields('E2E Skill Rules', defined.name),
		{ difficulty: defined.difficulty, difficultyEditable: false, initiative: defined.initiative, initiativeEditable: false },
	);
	e2e.expect(
		"#767 K2 a character's skill the compendium lacks shows the world's Default Difficulty and no Initiative, neither editable",
		await skillFields('E2E Skill Rules', 'E2E Unlisted Skill'),
		{
			difficulty: await gm.evaluate(() => CONFIG.genesys.settings.defaultDifficulty),
			difficultyEditable: false,
			initiative: false,
			initiativeEditable: false,
		},
	);
	await e2e.step('#767 K3 GM creates a skill in the world items', () =>
		gm.evaluate(async () => {
			await Item.create({ name: 'E2E World Skill', type: 'skill', system: { difficulty: 'DD', initiative: true } });
		}),
	);
	e2e.expect(
		'#767 K3 a skill no actor owns keeps both fields editable, with its own values',
		await skillFields(null, 'E2E World Skill'),
		{ difficulty: 'DD', difficultyEditable: true, initiative: true, initiativeEditable: true },
	);
	await gm.evaluate(async () => {
		await window.sheetsE2E.closeAll();
		await game.actors.getName('E2E Skill Rules').delete();
		await game.items.getName('E2E World Skill').delete();
	});
}
