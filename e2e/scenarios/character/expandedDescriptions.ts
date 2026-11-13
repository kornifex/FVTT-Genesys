import { CLOSED_DESCRIPTION, closedDescription, LONG_DESCRIPTION, shownDescription } from '../../descriptions.ts';
import type { ScenarioContext } from '../../scenario.ts';
import type { DescriptionRow, Evaluate } from './shared.ts';

/**
 * §#325: an expanded description shows its whole text, past the height that once cut it: a talent's in the Talents tab,
 * an armor's and a Critical Injury's in the Combat tab; and a closed one takes no height.
 */
export async function expandedDescriptions(e2e: ScenarioContext, page: Evaluate) {
	const D = 'Reader';
	const box = (row: DescriptionRow, cap: number) =>
		page((args) => window.characterE2E.descriptionBox(args.name, args.row, args.cap), { name: D, row, cap });
	const closed = (row: DescriptionRow) => closedDescription((cap) => box(row, cap));
	const clickChevron = (row: DescriptionRow) => page((args) => window.characterE2E.clickChevron(args.name, args.row), { name: D, row });

	await e2e.step('#325 A1 a talent with a description taller than 500px clicked open in the Talents tab', async () => {
		await page((name) => window.characterE2E.create(name), D);
		await page((args) => window.characterE2E.createItems(args.name, args.items), {
			name: D,
			items: [
				{
					name: 'E2E Verbose',
					type: 'talent',
					system: { activation: { type: 'passive', detail: '' }, tier: 1, description: LONG_DESCRIPTION },
				},
				{ name: 'E2E Padded Coat', type: 'armor', system: { state: 'equipped', description: LONG_DESCRIPTION } },
				{ name: 'E2E Deep Gash', type: 'injury', system: { severity: 'easy', description: LONG_DESCRIPTION } },
			],
		});
		await page((name) => window.characterE2E.open(name), D);
		await page((name) => window.e2e.showTab(name, 'talents'), D);
		await clickChevron({ talent: 'Verbose' });
	});
	e2e.expect(
		"#325 A1 the talent's description shows its last line, at its full height past 500px",
		await box({ talent: 'Verbose' }, 500),
		shownDescription(500),
	);
	await e2e.step('#325 A2 the talent clicked closed', () => clickChevron({ talent: 'Verbose' }));
	e2e.expect(
		"#325 A2 the talent's closed description takes no height, and animates its rows",
		await closed({ talent: 'Verbose' }),
		CLOSED_DESCRIPTION,
	);

	await e2e.step('#325 B1 the description of an armor taller than 200px opened in the Combat tab, by its chevron', async () => {
		await page((name) => window.e2e.showTab(name, 'combat'), D);
		await clickChevron({ armor: 'Padded Coat' });
	});
	e2e.expect(
		"#325 B1 the armor's description shows its last line, at its full height past 200px",
		await box({ armor: 'Padded Coat' }, 200),
		shownDescription(200),
	);
	await e2e.step('#325 B2 the description of the armor closed', () => clickChevron({ armor: 'Padded Coat' }));
	e2e.expect(
		"#325 B2 the armor's closed description takes no height, and animates its rows",
		await closed({ armor: 'Padded Coat' }),
		CLOSED_DESCRIPTION,
	);

	await e2e.step('#325 C1 the description of a Critical Injury taller than 200px opened in the Combat tab, by its chevron', () =>
		clickChevron({ injury: 'Deep Gash' }),
	);
	e2e.expect(
		"#325 C1 the Critical Injury's description shows its last line, at its full height past 200px",
		await box({ injury: 'Deep Gash' }, 200),
		shownDescription(200),
	);
	await e2e.step('#325 C2 the description of the Critical Injury closed', () => clickChevron({ injury: 'Deep Gash' }));
	e2e.expect(
		"#325 C2 the Critical Injury's closed description takes no height, and animates its rows",
		await closed({ injury: 'Deep Gash' }),
		CLOSED_DESCRIPTION,
	);
	await page((name) => window.characterE2E.close(name), D);
}
