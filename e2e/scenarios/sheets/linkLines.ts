import type { ScenarioContext } from '../../scenario.ts';
import type { LinkLines } from './shared.ts';

/**
 * Installs `window.linkLinesE2E`, over `window.sheetsE2E`. Playwright sends this function's source to the page, so it
 * uses nothing from this module.
 */
function installLinkLineHelpers() {
	if (window.linkLinesE2E) return;
	const { waitFor, render, actor, htmlOf } = window.e2e;
	const sheets = window.sheetsE2E;
	const count = 16;
	const paragraph = () =>
		`<p>E2E Place: ${Array.from({ length: count }, (_, index) => `@UUID[${actor('Hero').uuid}]{E2E Link ${index + 1}}`).join(', ')}</p>`;
	const round = (value: number) => Math.round(value * 10) / 10;
	const layOut = (element: HTMLElement): LinkLines => {
		const boxes = [...element.querySelectorAll('a.content-link')].map((link) => link.getBoundingClientRect());
		// The links of a line share their top.
		const byTop = new Map<number, DOMRect[]>();
		for (const box of boxes) byTop.set(Math.round(box.top), [...(byTop.get(Math.round(box.top)) ?? []), box]);
		const lines = [...byTop.entries()].sort(([a], [b]) => a - b).map(([, line]) => line);
		const gaps = lines
			.slice(1)
			.map((line, index) => Math.min(...line.map((box) => box.top)) - Math.max(...lines[index].map((box) => box.bottom)));
		const style = getComputedStyle(element);
		return {
			lines: lines.length,
			gap: gaps.length > 0 ? round(Math.min(...gaps)) : null,
			lineHeight: style.lineHeight,
			font: `${style.fontSize} ${style.fontFamily.split(',')[0]}`,
			linkHeight: round(boxes[0]?.height ?? 0),
		};
	};
	// The paragraph of links in an open sheet, once enriched.
	const linkParagraph = (root: Element, selector: string) =>
		waitFor(`the links in ${selector}`, () => {
			const found = [...root.querySelectorAll<HTMLElement>(`${selector} p`)].find(
				(element) => element.querySelectorAll('a.content-link').length === count,
			);
			return found && found.getBoundingClientRect().height > 0 ? found : undefined;
		});
	const targets = [
		{ key: 'gear', name: 'gear', field: 'system.description', tab: null, selector: 'prose-mirror[name="system.description"]' },
		{
			key: 'motivation',
			name: 'Hero',
			field: 'system.motivations.strength.description',
			tab: 'journal',
			selector: 'prose-mirror[name="system.motivations.strength.description"]',
		},
		{ key: 'nemesis', name: 'Nemesis', field: 'system.description', tab: null, selector: 'prose-mirror[name="system.description"]' },
		{ key: 'nemesisTalent', name: 'Nemesis/Ranked', field: 'system.description', tab: null, selector: '.talent .description' },
	];

	window.linkLinesE2E = {
		async sheetLinkLines() {
			const laidOut: Record<string, LinkLines> = {};
			for (const { key, name, field, tab, selector } of targets) {
				const stored = sheets.stored(name, field);
				await sheets.update(name, { [field]: paragraph() });
				// An owned item's text shows on its owner's sheet.
				const shownOn = name.split('/')[0];
				try {
					await sheets.open(shownOn);
					if (tab) await sheets.clickTab(shownOn, tab);
					laidOut[key] = layOut(
						await linkParagraph(
							htmlOf(game.actors.getName(`E2E ${shownOn}`)?.sheet ?? game.items.getName(`E2E ${shownOn}`).sheet)!,
							selector,
						),
					);
				} finally {
					await sheets.close(shownOn);
					await sheets.update(name, { [field]: stored });
				}
			}
			return laidOut;
		},

		async journalLinkLines() {
			const journal = await CONFIG.JournalEntry.documentClass.create({
				name: 'E2E Link Lines',
				pages: [{ name: 'E2E Page', type: 'text', text: { content: paragraph() } }],
			});
			const page = journal!.pages.contents[0];
			try {
				const laidOut = layOut(await linkParagraph(await render(journal!.sheet), '.journal-entry-page'));
				await journal!.sheet.close();
				const editor = await render(page.sheet, (root) => !!root.querySelector('.journal-page-content .ProseMirror p'));
				const editorParagraph = editor.querySelector<HTMLElement>('.journal-page-content .ProseMirror p')!;
				return { ...laidOut, editorLineHeight: getComputedStyle(editorParagraph).lineHeight };
			} finally {
				await page.sheet.close();
				await journal!.sheet.close();
				await journal!.delete();
			}
		},
	};
}

/**
 * §#490: Foundry draws a content link with a border and a top padding, a box taller than the line's text, which the
 * links of the next line can overlap.
 */
export async function linkLines(e2e: ScenarioContext) {
	const { gm } = e2e;
	await gm.evaluate(installLinkLineHelpers);
	let sheets: Record<string, LinkLines> = {};
	let journal: (LinkLines & { editorLineHeight: string }) | undefined;
	await e2e.step(
		"#490 A1 GM writes a paragraph of links in a gear's description, a Motivation, a nemesis's and its talent's",
		async () => {
			sheets = await gm.evaluate(() => window.linkLinesE2E.sheetLinkLines());
		},
	);
	await e2e.step("#490 A2 GM writes a paragraph of links in a journal text page, and opens the page's editor", async () => {
		journal = await gm.evaluate(() => window.linkLinesE2E.journalLinkLines());
	});
	for (const [key, laidOut] of Object.entries({ ...sheets, journal })) {
		if (!laidOut) continue;
		const { lines, gap, lineHeight, linkHeight, font } = laidOut;
		e2e.log(`#490 ${key}`, `${lines} lines, gap ${gap}px, line height ${lineHeight}, link ${linkHeight}px, ${font}`);
	}
	e2e.log('#490 journal editor line height', journal?.editorLineHeight);
	const apart = ({ gap }: LinkLines) => (gap === null ? 'on one line' : gap > 0 ? 'apart' : `overlapping by ${-gap}px`);
	e2e.expect(
		"#490 A1 in a sheet's rich text, the boxes of two links on consecutive lines keep a gap",
		Object.fromEntries(Object.entries(sheets).map(([key, laidOut]) => [key, apart(laidOut)])),
		{ gear: 'apart', motivation: 'apart', nemesis: 'apart', nemesisTalent: 'apart' },
	);
	// Foundry gives a journal page its body's line height (1.25), shorter than a link's box: a text page takes the sheets'
	// rich-text line height, in the journal and in the page's editor alike.
	e2e.expect(
		'#490 A2 in a journal text page, the boxes of two links on consecutive lines keep a gap, and its editor has the same line height',
		journal && { links: apart(journal), sameInEditor: journal.editorLineHeight === journal.lineHeight },
		{ links: 'apart', sameInEditor: true },
	);
}
