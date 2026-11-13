import type { HeadingStyle, SheetsHelpers, SheetsContext } from './shared.ts';

export async function headingsPart(ctx: SheetsContext) {
	const { e2e, gm } = ctx;
	let headings: Record<string, HeadingStyle> | undefined;
	await e2e.step('#346 GM opens a skill whose description holds headings', async () => {
		headings = await gm.evaluate(() => window.sheetsE2E.descriptionHeadings('skill'));
	});
	const appV1Heading = (size: number, border: string) => ({
		size,
		margin: '0 0 0.5 0',
		weight: '400',
		lineHeight: 'normal',
		// AppV1's text colour, which the sheets' windows give their content.
		color: 'rgb(25, 24, 19)',
		shadow: 'none',
		border,
	});
	const underline = (width: string) => `${width} solid rgb(120, 46, 34)`;
	e2e.expect(
		"#346 A1 a description's headings look as in an AppV1 window: the window's text colour, no shadow, AppV1's sizes, margins and rules",
		headings,
		{
			h1: appV1Heading(2, underline('2px')),
			h2: appV1Heading(1.5, underline('1px')),
			h3: appV1Heading(1.25, underline('1px')),
			// #486: between the h3 and the text, with the same rule.
			h4: appV1Heading(1.1, underline('1px')),
		},
	);
	// #505: Foundry rules only a journal page's h1 and h2, and draws its h4 at the text's size. A text page's h3 and h4 take
	// a sheet's sizes and rules, in Foundry's colour and with Foundry's spacing, in the journal and in the page's editor.
	let journalHeadings: Awaited<ReturnType<SheetsHelpers['journalHeadings']>> | undefined;
	await e2e.step('#505 GM opens a journal text page holding an h3 and an h4, then the page in its editor', async () => {
		journalHeadings = await gm.evaluate(() => window.sheetsE2E.journalHeadings());
	});
	// Foundry's text colour and line height (one line of the heading's size) for a journal's headings, and its rule colour
	// (`--color-warm-3`), in its dark theme. Foundry spaces a heading that isn't first by 1rem in the journal, not in the
	// page's editor.
	const journalHeading = (size: number, lineHeight: string, top: number) => ({
		size,
		margin: `${top} 0 0.5 0`,
		weight: '400',
		lineHeight,
		color: 'rgb(239, 230, 216)',
		shadow: 'none',
		border: '1px solid rgb(93, 20, 43)',
	});
	e2e.expect("#505 A1 a journal text page's h3 and h4 take a sheet's sizes and rules, in the page and in its editor", journalHeadings, {
		page: { h3: journalHeading(1.25, '17.5px', 0), h4: journalHeading(1.1, '15.4px', 1) },
		editor: { h3: journalHeading(1.25, '17.5px', 0), h4: journalHeading(1.1, '15.4px', 0) },
	});

	// #430: Foundry gives a chat message's headings its own sizes and colours. The headings of a description in the
	// system's cards look as in the sheet that shows it, and a plain message's are left alone.
	let cardHeadings: Awaited<ReturnType<SheetsHelpers['cardHeadings']>> | undefined;
	await e2e.step(
		"#430 GM sends a gear's and a talent's card, then a check's card and a plain message, all holding headings",
		async () => {
			cardHeadings = await gm.evaluate(() => window.sheetsE2E.cardHeadings());
		},
	);
	// The card's text colour, which its headings take as a sheet's do.
	const cardHeading = (size: number, border: string) => ({ ...appV1Heading(size, border), color: 'rgb(17, 17, 17)' });
	e2e.expect(
		"#430 A1 a gear card's description headings look as in its sheet: the card's text colour, AppV1's sizes, margins and rules",
		cardHeadings?.gear,
		{
			h1: cardHeading(2, underline('2px')),
			h2: cardHeading(1.5, underline('1px')),
			h3: cardHeading(1.25, underline('1px')),
			h4: cardHeading(1.1, underline('1px')),
		},
	);
	e2e.expect(
		"#430 A2 a talent card's and a check card's description h3 look as in a sheet",
		{ talent: cardHeadings?.talent, check: cardHeadings?.check },
		{ talent: cardHeading(1.25, underline('1px')), check: cardHeading(1.25, underline('1px')) },
	);
	e2e.expect("#430 A3 a plain chat message's h3 keeps Foundry's look", cardHeadings?.message, {
		size: 2,
		margin: '0 0 1 0',
		weight: '700',
		lineHeight: '28px',
		color: 'rgb(34, 34, 34)',
		shadow: 'none',
		border: 'none',
	});
}
