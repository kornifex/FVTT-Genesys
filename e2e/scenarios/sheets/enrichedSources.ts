import type { SheetsContext } from './shared.ts';



export async function enrichedSourcesPart(ctx: SheetsContext) {
	const { e2e, gm } = ctx;
	const sources = ['Nemesis', 'gear', 'career', 'archetype'];
	const sourceText = await gm.evaluate(() => `@UUID[${game.actors.getName('E2E Hero').uuid}]{E2E Hero} [[/r 1d6]] @check[Athletics]`);
	await e2e.step('#101 GM writes a source with a link, an inline roll and a check link', () =>
		gm.evaluate(
			async ({ names, source }) => {
				for (const name of names) await window.sheetsE2E.update(name, { 'system.source': source });
			},
			{ names: sources, source: sourceText },
		),
	);
	const before: Record<string, unknown> = {};
	await e2e.step('#101 GM opens the sheets while their source is being enriched', async () => {
		for (const name of sources) before[name] = await gm.evaluate((name) => window.sheetsE2E.sourceBeforeEnrichment(name), name);
	});
	e2e.expect(
		'#101 A2 the source line shows its raw text before enrichment',
		before,
		Object.fromEntries(sources.map((name) => [name, { before: sourceText, afterLinks: 1 }])),
	);
	const editedSource = await gm.evaluate(
		() => `@UUID[${game.actors.getName('E2E Bearer').uuid}]{E2E Bearer} [[/r 2d6]] @check[Cool]`,
	);
	await e2e.step('#101 GM edits the source of an adversary, an item, a career and an archetype', () =>
		gm.evaluate(
			async ({ names, source }) => {
				for (const name of names) {
					await window.sheetsE2E.open(name);
					await window.sheetsE2E.update(name, { 'system.source': source });
				}
			},
			{ names: sources, source: editedSource },
		),
	);
	const enriched = await gm.evaluate(
		(names) =>
			Object.fromEntries(
				names.map((name) => {
					const { links, rolls, checks, italic, smaller, html } = window.sheetsE2E.source(name);
					return [name, { links, rolls, checks, italic, smaller, edited: html.includes('E2E Bearer') }];
				}),
			),
		sources,
	);
	e2e.expect(
		'#101 A3 an edited source shows enriched right away, in small italics',
		enriched,
		Object.fromEntries(sources.map((name) => [name, { links: 1, rolls: 1, checks: 1, italic: true, smaller: true, edited: true }])),
	);
	await gm.evaluate(() => window.sheetsE2E.closeAll());

	// §#101: with Foundry's own enrichment, as the table sees it, every content the source line shows from the sheet's
	// first paint on is its raw text or its enriched text, never an empty line.
	const shownSources: Record<string, string[]> = {};
	await e2e.step(
		'#101 GM opens the sheets of an adversary, an item, a career and an archetype, watching their source line',
		async () => {
			for (const name of sources) shownSources[name] = await gm.evaluate((name) => window.sheetsE2E.sourceAsShown(name), name);
		},
	);
	e2e.expect(
		"#101 A4 with Foundry's own enrichment, the source line shows its raw text, then its link, and never an empty line",
		shownSources,
		Object.fromEntries(sources.map((name) => [name, ['raw', 'enriched']])),
	);
	await gm.evaluate(() => window.sheetsE2E.closeAll());
}
