import type { ScenarioContext } from '../../scenario.ts';
import type { Evaluate } from './shared.ts';

/** §#252: the Talents tab's groups, and their order. */
export async function talentsTab(e2e: ScenarioContext, page: Evaluate) {
	const L = 'Lister';
	const entry = (name: string, type: 'talent' | 'ability', activation: string, detail = '', tier = 1) => ({
		name: `E2E ${name}`,
		type,
		system: { activation: { type: activation, detail }, ...(type === 'talent' ? { tier } : {}) },
	});
	await e2e.step(
		'#252 C1 a character with active and passive talents and abilities of several tiers and details, its sheet open',
		async () => {
			await page((name) => window.characterE2E.create(name), L);
			await page((args) => window.characterE2E.createItems(args.name, args.items), {
				name: L,
				items: [
					entry('Toughened', 'talent', 'passive', '', 2),
					entry('Quick Strike', 'talent', 'active', 'Maneuver', 2),
					entry('Parry', 'talent', 'active', 'Incidental, Out of Turn', 1),
					entry('Dodge', 'talent', 'active', '', 3),
					entry('Brace', 'talent', 'active', 'maneuver', 1),
					entry('Rapid Reaction', 'talent', 'active', '', 1),
					entry('Grit', 'talent', 'passive', '', 1),
					entry('Sturdy', 'ability', 'passive'),
					entry('Nimble', 'ability', 'active', 'Maneuver'),
					entry('Keen Eyes', 'ability', 'passive'),
					entry('Rally', 'ability', 'active'),
				],
			});
			await page((name) => window.characterE2E.open(name), L);
		},
	);
	e2e.expect(
		'#252 C1 the Talents tab lists active then passive ones, those with an activation detail under it whatever its case, each by tier then name',
		await page((name) => window.characterE2E.talentsTab(name), L),
		{
			abilities: ['[Active]', 'Rally', '[[maneuver]]', 'Nimble', '[Passive]', 'Keen Eyes', 'Sturdy'],
			talents: [
				'[Active]',
				'Rapid Reaction',
				'Dodge',
				'[[maneuver]]',
				'Brace',
				'Quick Strike',
				'[[incidental, out of turn]]',
				'Parry',
				'[Passive]',
				'Grit',
				'Toughened',
			],
		},
	);

	const trash = (answer: 'yes' | 'no') =>
		page(
			async (args) => {
				await window.characterE2E.trashTalentRow(args.actor, 'Rally');
				return window.e2e.answerConfirm(args.answer);
			},
			{ actor: L, answer },
		);
	const rally = async () => (await page((name) => window.characterE2E.items(name), L)).filter((item) => item.endsWith(':E2E Rally'));
	let asked: Awaited<ReturnType<typeof trash>> = null;
	// Its trash icon moved into its ⋮ menu, and the system's deletion dialog replaced Foundry's (#577).
	await e2e.step("#252 C2 the Delete of Lister's ability Rally clicked, and No answered", async () => {
		asked = await trash('no');
	});
	e2e.expect(
		"#252 C2 the Talents tab's Delete asks in the deletion dialog, which names the ability, No by default, and No keeps it",
		{ asked, rally: await rally() },
		{
			asked: {
				application: 'DialogV2',
				title: 'Confirm Deletion',
				content: "Delete E2E Rally? This can't be undone.",
				buttons: ['yes', 'no'],
				defaultButton: 'no',
			},
			rally: ['ability:E2E Rally'],
		},
	);
	await e2e.step("#252 C3 the Delete of Lister's ability Rally clicked, and Yes answered", async () => {
		asked = await trash('yes');
	});
	e2e.expect('#252 C3 Yes deletes the ability', await rally(), []);
	await page((name) => window.characterE2E.close(name), L);
}
