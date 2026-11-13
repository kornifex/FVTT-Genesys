import {
	CLOSED_CHEVRON,
	CLOSED_DESCRIPTION,
	closedDescription,
	LONG_DESCRIPTION,
	OPEN_CHEVRON,
	shownDescription,
} from '../../descriptions.ts';
import type { ScenarioContext } from '../../scenario.ts';
import type { DescriptionRow, Evaluate } from './shared.ts';

/**
 * §#515, §#579: the chevron after the name of a Talents tab row, a talent's or a special ability's, opens and closes its
 * description; since #579 the name opens the talent's sheet, and a talent without a description shows a chevron too,
 * which opens its tier and source.
 */
export async function talentRowDescriptions(e2e: ScenarioContext, page: Evaluate) {
	const S = 'Scholar';
	const box = (row: DescriptionRow, cap: number) =>
		page((args) => window.characterE2E.descriptionBox(args.name, args.row, args.cap), { name: S, row, cap });
	const closed = (row: DescriptionRow) => closedDescription((cap) => box(row, cap));
	const chevron = (row: DescriptionRow) => page((args) => window.characterE2E.chevron(args.name, args.row), { name: S, row });
	const clickChevron = (row: DescriptionRow) => page((args) => window.characterE2E.clickChevron(args.name, args.row), { name: S, row });
	const clickName = (row: DescriptionRow) => page((args) => window.characterE2E.clickName(args.name, args.row), { name: S, row });
	const closeOpened = (item: string) => page((args) => window.characterE2E.closeOpened(args.name, args.item), { name: S, item });
	const LORE = { talent: 'Lore' };
	const INSIGHT = { talent: 'Insight' };
	const BLANK = { talent: 'Blank' };
	const passive = { activation: { type: 'passive', detail: '' } };

	await e2e.step(
		'#515 A1 a character with 100 XP given a described ranked talent, a described special ability, and a talent without a description, its Talents tab shown',
		async () => {
			await page((name) => window.characterE2E.create(name), S);
			await page(
				(name) =>
					game.actors.getName(`E2E ${name}`).update({ 'system.experienceJournal.entries': [{ type: 'Award', amount: 100 }] }),
				S,
			);
			await page((args) => window.characterE2E.createItems(args.name, args.items), {
				name: S,
				items: [
					{
						name: 'E2E Lore',
						type: 'talent',
						system: { ...passive, tier: 1, ranked: 'yes', rank: 1, description: LONG_DESCRIPTION },
					},
					{ name: 'E2E Insight', type: 'ability', system: { ...passive, description: '<p>Sees through lies.</p>' } },
					// Foundry's editor saves a description cleared in it as an empty paragraph. A second tier 1 talent lets
					// Lore rise to tier 2: its row shows the rank upgrade arrow.
					{ name: 'E2E Blank', type: 'talent', system: { ...passive, tier: 1, description: '<p></p>', source: 'E2E p. 1' } },
				],
			});
			await page((name) => window.characterE2E.open(name), S);
			await page((name) => window.e2e.showTab(name, 'talents'), S);
		},
	);
	e2e.expect(
		"#515 A1 a talent's and a special ability's rows show a chevron after their name, pointing right, and every description starts closed",
		{
			lore: await chevron(LORE),
			insight: await chevron(INSIGHT),
			loreBox: await closed(LORE),
			insightBox: await closed(INSIGHT),
			blankBox: await closed(BLANK),
		},
		{
			lore: CLOSED_CHEVRON,
			insight: CLOSED_CHEVRON,
			loreBox: CLOSED_DESCRIPTION,
			insightBox: CLOSED_DESCRIPTION,
			blankBox: CLOSED_DESCRIPTION,
		},
	);
	e2e.expect('#579 B1 a talent without a description shows a chevron too, for its tier and source', await chevron(BLANK), CLOSED_CHEVRON);
	e2e.expect(
		"#515 A1 the chevron sits after the talent's name and rank, before its rank upgrade arrow",
		await page((name) => window.characterE2E.talentNameParts(name, 'Lore'), S),
		['E2E Lore 1', 'chevron', 'upgrade'],
	);

	await e2e.step("#515 A2 the talent's chevron clicked", () => clickChevron(LORE));
	e2e.expect(
		"#515 A2 the talent's description shows its last line, at its full height past 500px, its chevron pointing down, and the special ability's stays closed",
		{ box: await box(LORE, 500), chevron: await chevron(LORE), insight: await closed(INSIGHT) },
		{ box: shownDescription(500), chevron: OPEN_CHEVRON, insight: CLOSED_DESCRIPTION },
	);

	// Since #579, the name opens the talent's sheet, as on any row that can't roll, rather than folding its description.
	await e2e.step("#579 B2 the talent's name clicked", () => clickName(LORE));
	e2e.expect(
		"#579 B2 the talent's name opens its sheet, and leaves the description the chevron opened open",
		{ box: await box(LORE, 500), chevron: await chevron(LORE), ...(await closeOpened('Lore')) },
		{ box: shownDescription(500), chevron: OPEN_CHEVRON, sheet: true, dicePrompt: false },
	);

	await e2e.step("#515 A5 the talent's chevron clicked", () => clickChevron(LORE));
	e2e.expect(
		'#515 A5 the chevron closes the description, and tells it is collapsed again',
		{ box: await closed(LORE), chevron: await chevron(LORE) },
		{ box: CLOSED_DESCRIPTION, chevron: CLOSED_CHEVRON },
	);

	await e2e.step("#515 A6 the special ability's chevron clicked", () => clickChevron(INSIGHT));
	const insightOpen = await box(INSIGHT, 500);
	e2e.expect(
		"#515 A6 the special ability's description opens whole, its chevron pointing down",
		{
			open: insightOpen && { clipped: insightOpen.clipped, lastInside: insightOpen.lastInside, transition: insightOpen.transition },
			chevron: await chevron(INSIGHT),
		},
		{ open: { clipped: 0, lastInside: true, transition: CLOSED_DESCRIPTION.transition }, chevron: OPEN_CHEVRON },
	);
	await e2e.step("#515 A7 the special ability's chevron clicked again", () => clickChevron(INSIGHT));
	e2e.expect(
		"#515 A7 the special ability's description closes, its chevron telling it is collapsed",
		{ box: await closed(INSIGHT), chevron: await chevron(INSIGHT) },
		{ box: CLOSED_DESCRIPTION, chevron: CLOSED_CHEVRON },
	);

	await e2e.step('#579 B3 the chevron of the talent without a description clicked', () => clickChevron(BLANK));
	const blankOpen = await box(BLANK, 500);
	e2e.expect(
		'#579 B3 the chevron of a talent without a description opens its tier and source',
		{
			open: blankOpen && {
				shown: typeof blankOpen.height === 'number' && blankOpen.height > 0,
				// Its last element is the source, under the tier.
				lastInside: blankOpen.lastInside,
				transition: blankOpen.transition,
			},
			tier: (await page((name) => window.characterE2E.talent(name, 'E2E Blank'), S))?.rowTier,
			chevron: await chevron(BLANK),
		},
		{ open: { shown: true, lastInside: true, transition: CLOSED_DESCRIPTION.transition }, tier: '1', chevron: OPEN_CHEVRON },
	);
	await page((name) => window.characterE2E.close(name), S);
}
