import type { SheetsHelpers, SheetsContext } from './shared.ts';

export async function characteristicBoxesPart(ctx: SheetsContext) {
	const { e2e, gm, player } = ctx;
	let boxes = {};
	await e2e.step(
		'#650 A1 GM opens, at their default width, a character who can raise a characteristic, a nemesis, an archetype and a vehicle, in English and in French, in each Style',
		async () => {
			boxes = await gm.evaluate(async () => {
				const language = game.i18n.lang;
				const style = document.documentElement.dataset.genesysStyle;
				const measured: Record<string, unknown> = {};
				try {
					for (const lang of ['en', 'fr']) {
						await game.i18n.setLanguage(lang);
						for (const key of ['genesys', 'terrinoth']) {
							document.documentElement.dataset.genesysStyle = key;
							for (const name of ['Observed', 'Nemesis', 'archetype', 'Vehicle']) {
								await window.sheetsE2E.open(name);
								await document.fonts.ready;
								const sheet = game.actors.getName(`E2E ${name}`) ?? game.items.getName(`E2E ${name}`);
								const root = window.e2e.htmlOf(sheet.sheet)!;
								const fields = [...root.querySelectorAll<HTMLElement>('.characteristic-field')];
								const row = fields[0]?.parentElement;
								const rect = (element: Element) => element.getBoundingClientRect();
								// What the row draws, within the sheet's content box: its first and last boxes, which reach
								// 1em past it, and its band, 1.5rem past it on each side.
								const rowFits = (root: HTMLElement, row: HTMLElement) => {
									const content = root.querySelector('.window-content')!;
									const style = getComputedStyle(content);
									const [left, right] = [
										rect(content).left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft),
										rect(content).right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight),
									];
									const boxes = [...row.querySelectorAll('.box')];
									const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
									const band = row.classList.contains('band') ? 1.5 * rem : 0;
									return (
										boxes.length > 0 &&
										rect(boxes[0]).left >= left - 1 &&
										rect(boxes.at(-1)!).right <= right + 1 &&
										rect(row).left - band >= left - 1 &&
										rect(row).right + band <= right + 1
									);
								};
								// Each box to a pixel's rounding.
								const boxes = fields.map((field) => {
									const label = field.querySelector<HTMLElement>('.characteristic-label')!;
									const [name, raise] = [label.firstElementChild!, label.querySelector('.raise')];
									const [box, value, named] = [
										rect(field.querySelector('.box')!),
										rect(field.querySelector('.value')!),
										rect(name),
									];
									// The label's own width, which the grid stretches to its column's.
									label.style.width = 'max-content';
									const labelWidth = rect(label).width;
									label.style.width = '';
									const within = (inner: DOMRect) =>
										inner.left >= box.left - 1 &&
										inner.right <= box.right + 1 &&
										inner.top >= box.top - 1 &&
										inner.bottom <= box.bottom + 1;
									const raised = raise && rect(raise);
									return {
										name: name.textContent.trim(),
										width: field.offsetWidth,
										fitted:
											field.offsetWidth > 0 && Math.abs(field.offsetWidth - Math.max(labelWidth, value.width)) <= 1,
										nameCentred: Math.abs(named.left + named.width / 2 - (value.left + value.width / 2)) <= 1,
										nameInBox: within(named),
										// Inside the box, on the name's line, at most a quarter of an em past its end.
										raiseBeside:
											!raised ||
											(within(raised) &&
												raised.left >= named.right - 1 &&
												raised.left <= named.right + 5 &&
												raised.top + raised.height / 2 > named.top &&
												raised.top + raised.height / 2 < named.bottom),
										raise: !!raise,
										nameWidth: named.width,
									};
								});
								measured[`${name} ${lang} ${key}`] = {
									fields: boxes.length,
									fitted: boxes.every((box) => box.fitted),
									namesCentred: boxes.every((box) => box.nameCentred && box.nameInBox),
									raisesBeside: boxes.every((box) => box.raiseBeside),
									raises: boxes.filter((box) => box.raise).length,
									// Each box's width, by its name: not all one, and a longer name never in a narrower box.
									widths: boxes.map((box) => `${box.name} ${box.width}`).join(', '),
									widthsDiffer: new Set(boxes.map((box) => box.width)).size > 1,
									longerNameNoNarrower: boxes.every((a) =>
										boxes.every((b) => a.nameWidth <= b.nameWidth + 1 || a.width >= b.width),
									),
									rowFits: rowFits(root, row!),
								};
								await window.sheetsE2E.close(name);
							}
						}
					}
				} finally {
					await game.i18n.setLanguage(language);
					if (style === undefined) delete document.documentElement.dataset.genesysStyle;
					else document.documentElement.dataset.genesysStyle = style;
				}
				return measured;
			});
		},
	);
	// The widths in pixels, which the fonts set, are logged rather than asserted.
	const measured = boxes as Record<string, { widths: string }>;
	e2e.log('#650 widths', Object.fromEntries(Object.entries(measured).map(([sheet, { widths }]) => [sheet, widths])));
	const fit = (fields: number, raises: number) => ({
		fields,
		fitted: true,
		namesCentred: true,
		raisesBeside: true,
		raises,
		widthsDiffer: true,
		longerNameNoNarrower: true,
		rowFits: true,
	});
	e2e.expect(
		"#650 A1 each characteristic's box is fitted to its own name and ↑, its ↑ inside the box beside the name, its name centred under its value, boxes of different names of different widths, and the row fits the sheet",
		Object.fromEntries(Object.entries(measured).map(([sheet, { widths: _widths, ...shape }]) => [sheet, shape])),
		Object.fromEntries(
			['en', 'fr'].flatMap((lang) =>
				['genesys', 'terrinoth'].flatMap((key) => [
					[`Observed ${lang} ${key}`, fit(6, 6)],
					[`Nemesis ${lang} ${key}`, fit(6, 0)],
					[`archetype ${lang} ${key}`, fit(6, 0)],
					[`Vehicle ${lang} ${key}`, fit(3, 0)],
				]),
			),
		),
	);

	// A character's boxes keep their ↑'s room whether a raise shows or not: they don't widen, nor the row move, as XP
	// runs out, nor between the GM, who may raise, and a player who observes.
	type Row = ReturnType<SheetsHelpers['characteristicRow']>;
	const rows: Record<string, Row> = {};
	await e2e.step('#650 A2 GM and the observing player open the character who can raise every characteristic', async () => {
		rows.gm = await gm.evaluate(async () => {
			await window.sheetsE2E.open('Observed');
			return window.sheetsE2E.characteristicRow('Observed');
		});
		rows.observer = await player.evaluate(async () => {
			await window.sheetsE2E.open('Observed');
			return window.sheetsE2E.characteristicRow('Observed');
		});
	});
	await e2e.step('#650 A2 the character spends all their XP', async () => {
		rows.spent = await gm.evaluate(async () => {
			const observed = game.actors.getName('E2E Observed');
			try {
				await observed.update({ 'system.experienceJournal.entries': [{ amount: 0, type: 'Starting' }] });
				// On v13 the sheet is briefly not rendered while the update renders it again.
				await window.e2e.waitFor(
					'the ↑ gone',
					() => observed.sheet.rendered && window.sheetsE2E.characteristicRow('Observed').raises === 0,
				);
				return window.sheetsE2E.characteristicRow('Observed');
			} finally {
				// The XP the scenario's setup gave, which other parts rely on.
				await observed.update({ 'system.experienceJournal.entries': [{ amount: 100, type: 'Starting' }] });
				await window.sheetsE2E.close('Observed');
			}
		});
		await player.evaluate(() => window.sheetsE2E.close('Observed'));
	});
	e2e.log('#650 A2 rows', rows);
	const shape = ({ gm, observer, spent }: Record<string, Row>) => ({
		shown: { gm: [gm.raises, gm.rooms], observer: [observer.raises, observer.rooms], spent: [spent.raises, spent.rooms] },
		sameWidths: [observer, spent].map((row) => row.widths.join() === gm.widths.join()),
		sameEdges: [observer, spent].map((row) => row.edges.join() === gm.edges.join()),
	});
	e2e.expect(
		"#650 A2 a character's boxes keep their width and the row its place, whether the ↑ shows (the GM, with XP), not to an observer, or not once the XP is spent: each box keeps the ↑'s room",
		shape(rows),
		{
			// [↑ shown, rooms kept]
			shown: { gm: [6, 0], observer: [0, 6], spent: [0, 6] },
			sameWidths: [true, true],
			sameEdges: [true, true],
		},
	);
}
