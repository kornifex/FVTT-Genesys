import {
	CLOSED_CHEVRON,
	CLOSED_DESCRIPTION,
	closedDescription,
	LONG_DESCRIPTION,
	OPEN_CHEVRON,
	shownDescription,
} from '../../descriptions.ts';
import type { ScenarioContext } from '../../scenario.ts';
import type { FoldHalfway, Evaluate } from './shared.ts';

/**
 * §#516: a fold opens and closes in 0.2s, its content shown from its opening's start and until its closing's end, then
 * hidden, so that Tab skips it; under `prefers-reduced-motion`, at once. Read on a talent whose long description ends
 * with a link, as #325's. §#579: its chevron opens and closes it from the keyboard.
 */
export async function folds(e2e: ScenarioContext, page: Evaluate) {
	const D = 'Folder';
	const TALENT = { talent: 'Verbose' };
	const halfway = () => page((args) => window.characterE2E.foldHalfway(args.name, args.row), { name: D, row: TALENT });
	const closed = () =>
		closedDescription((cap) =>
			page((args) => window.characterE2E.descriptionBox(args.name, args.row, args.cap), { name: D, row: TALENT, cap }),
		);
	const twoFolds = async () => {
		const opening = await halfway();
		await e2e.settle();
		const closing = await halfway();
		return { opening, closing };
	};

	let folded: { opening: FoldHalfway; closing: FoldHalfway } | null = null;
	await e2e.step("#516 B1 the talent's long description clicked open, then closed, each fold read halfway", async () => {
		await page(
			(args) =>
				window.characterE2E.create(args.name, 'character', [
					{
						name: 'E2E Verbose',
						type: 'talent',
						system: { activation: { type: 'passive', detail: '' }, tier: 1, description: args.description },
					},
				]),
			{ name: D, description: LONG_DESCRIPTION },
		);
		await page((name) => window.characterE2E.open(name), D);
		await page((name) => window.e2e.showTab(name, 'talents'), D);
		folded = await twoFolds();
	});
	const moving: FoldHalfway = { transitions: ['grid-template-rows', 'visibility'], height: 'partway', lastVisibility: 'visible' };
	e2e.expect('#516 B1 halfway through its opening and its closing, the description is partway open and its link visible', folded, {
		opening: moving,
		closing: moving,
	});
	e2e.expect(
		'#516 B1 once its closing ends, the description takes no height and its link is hidden, so Tab skips it',
		await closed(),
		CLOSED_DESCRIPTION,
	);

	const { gm } = e2e;
	await e2e.step('#516 C1 under prefers-reduced-motion, the talent clicked open, then closed, each fold read at its start', async () => {
		await gm.page.emulateMedia({ reducedMotion: 'reduce' });
		try {
			folded = await twoFolds();
		} finally {
			await gm.page.emulateMedia({ reducedMotion: null });
		}
	});
	e2e.expect('#516 C1 under prefers-reduced-motion, the description opens and closes at once, with no transition', folded, {
		opening: { transitions: [], height: 'whole', lastVisibility: 'visible' },
		closing: { transitions: [], height: 'none', lastVisibility: 'hidden' },
	});

	// §#579: the chevron opens and closes the fold from the keyboard, and Tab reaches the fold's link only while it shows.
	const chevron = () => page((args) => window.characterE2E.chevron(args.name, args.row), { name: D, row: TALENT });
	const focus = () => page((args) => window.characterE2E.focusInRow(args.name, args.row), { name: D, row: TALENT });
	await e2e.step("#579 A1 the talent's chevron focused, Enter pressed", async () => {
		await page((args) => window.characterE2E.focusChevron(args.name, args.row), { name: D, row: TALENT });
		await gm.page.keyboard.press('Enter');
	});
	e2e.expect(
		'#579 A1 Enter on the chevron opens the fold, and the focus stays on the chevron',
		{
			chevron: await chevron(),
			box: await page((args) => window.characterE2E.descriptionBox(args.name, args.row, args.cap), {
				name: D,
				row: TALENT,
				cap: 500,
			}),
			focus: await focus(),
		},
		{ chevron: OPEN_CHEVRON, box: shownDescription(500), focus: 'chevron' },
	);
	await e2e.step('#579 A2 Tab pressed', () => gm.page.keyboard.press('Tab'));
	e2e.expect('#579 A2 from the chevron of an open fold, Tab reaches the link at the end of its description', await focus(), 'link');
	await e2e.step('#579 A3 Shift+Tab pressed, then Space', async () => {
		await gm.page.keyboard.press('Shift+Tab');
		await gm.page.keyboard.press('Space');
	});
	e2e.expect(
		'#579 A3 Space on the chevron closes the fold, and the focus stays on the chevron',
		{ chevron: await chevron(), box: await closed(), focus: await focus() },
		{ chevron: CLOSED_CHEVRON, box: CLOSED_DESCRIPTION, focus: 'chevron' },
	);
	await e2e.step('#579 A4 Tab pressed once the fold closed', () => gm.page.keyboard.press('Tab'));
	e2e.expect("#579 A4 from the chevron of a closed fold, Tab skips the fold's link for the row's next button", await focus(), 'row');
	await page((name) => window.characterE2E.close(name), D);
}
