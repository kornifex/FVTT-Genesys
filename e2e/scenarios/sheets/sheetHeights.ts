import type { ScenarioContext } from '../../scenario.ts';

/**
 * An open sheet's window, by what #514 asks of it: its height, the highest Foundry lets it take (its CSS maximum height,
 * or the viewport's), whether its content scrolls, whether an element of its content shows whole, and whether the window
 * lies within the viewport.
 */
type WindowFit = { height: number; ceiling: number; scrolls: boolean; lastShown: boolean; onScreen: boolean };

type SheetHeightHelpers = {
	/**
	 * Closes a sheet, opens it again, and reads its window: `last` finds the element of its content that shows last, read
	 * with the content scrolled to its bottom when `toBottom` is set.
	 */
	reopen(name: string, last: string, toBottom?: boolean): Promise<WindowFit>;
	/** The height of an open sheet's window. */
	height(name: string): number;
	/**
	 * Shows a tab of an open sheet, then opens the description of the first talent row of that tab: the window's height
	 * before, after the tab, and after the description opened, and whether it opened.
	 */
	tabThenTalent(name: string, tab: string): Promise<{ opened: number; tab: number; talent: number; expanded: boolean }>;
};

declare global {
	interface Window {
		sheetHeightsE2E: SheetHeightHelpers;
	}
}

/**
 * Installs `window.sheetHeightsE2E`, over `window.sheetsE2E`. Playwright sends this function's source to the page, so it
 * uses nothing from this module.
 */
function installSheetHeightHelpers() {
	if (window.sheetHeightsE2E) return;
	const { htmlOf, settle, waitFor } = window.e2e;
	const sheets = window.sheetsE2E;
	const appOf = (name: string) => (game.actors.getName(`E2E ${name}`) ?? game.items.getName(`E2E ${name}`)).sheet;
	const elementOf = (name: string) => {
		const element = htmlOf(appOf(name));
		if (!element) throw new Error(`The sheet of E2E ${name} is closed`);
		return element;
	};
	const helpers: SheetHeightHelpers = {
		async reopen(name, last, toBottom = false) {
			await sheets.close(name);
			await sheets.open(name);
			// The window fits again the content an enrichment brings, once it shows.
			await appOf(name).contentShown?.();
			await settle();
			const element = elementOf(name);
			const content = element.querySelector<HTMLElement>('.window-content')!;
			const lastElement = await waitFor(`${last} on the sheet of E2E ${name}`, () => content.querySelector(last));
			const scrolls = content.scrollHeight - content.clientHeight > 1;
			if (toBottom) content.scrollTop = content.scrollHeight;
			const box = element.getBoundingClientRect();
			const shown = content.getBoundingClientRect();
			const lastBox = lastElement.getBoundingClientRect();
			const maxHeight = parseFloat(getComputedStyle(element).maxHeight);
			return {
				height: Math.round(box.height),
				ceiling: Math.round(Math.min(Number.isNaN(maxHeight) ? Infinity : maxHeight, document.documentElement.clientHeight)),
				scrolls,
				// Half a pixel of slack, for a box whose edges fall between two pixels.
				lastShown: lastBox.top >= shown.top - 0.5 && lastBox.bottom <= shown.bottom + 0.5,
				onScreen: box.top >= 0 && box.bottom <= document.documentElement.clientHeight + 0.5,
			};
		},

		height(name) {
			return Math.round(elementOf(name).getBoundingClientRect().height);
		},

		async tabThenTalent(name, tab) {
			const opened = helpers.height(name);
			await sheets.clickTab(name, tab);
			const afterTab = helpers.height(name);
			// The first row whose fold has something to show: an ability without a description or source shows no chevron
			// since #579, nor anything once open.
			const rows = [...elementOf(name).querySelectorAll<HTMLElement>(`.tab[data-tab="${tab}"] .talent`)];
			const row = rows.find((candidate) => candidate.querySelector('.description-toggle')) ?? rows[0];
			if (!row) throw new Error(`No talent on the ${tab} tab of E2E ${name}`);
			// The talent's chevron opens its description (#515); a talent shows one for its tier since #579, and its name
			// opened it before, on the build a comparison runs.
			if (!window.e2e.clickChevron(row)) row.querySelector<HTMLElement>('.name button')!.click();
			// The description opens through a transition, which settling waits for. `.active` marked it open before #579.
			const open = () => row.querySelector('.description-fold.open, .active');
			await waitFor(`the description of the talent on the ${tab} tab of E2E ${name}`, open);
			await settle();
			return {
				opened,
				tab: afterTab,
				talent: helpers.height(name),
				expanded: !!open(),
			};
		},
	};
	window.sheetHeightsE2E = helpers;
}

/**
 * §#514: a sheet opens at its content's height, measured once it has rendered, on the tab it opens on: no lower than its
 * minimum height, no higher than Foundry lets a window be. Once open, its height stays put; a height set by hand is
 * forgotten once it closes.
 */
export async function sheetHeights(e2e: ScenarioContext) {
	const { gm } = e2e;
	await gm.evaluate(installSheetHeightHelpers);
	const viewport = gm.page.viewportSize();
	const twoLines =
		'<p>Once per session, the character may add a Boost die to a check made to resist fear, or to recover from it, as a free action.</p>';
	const longDescription = Array.from({ length: 12 }, (_, index) => `<p>Line ${index + 1} of a longer description.</p>`).join('');
	const stored = await gm.evaluate(() => ({
		talent: window.sheetsE2E.stored('talent', 'system.description'),
		ranked: window.sheetsE2E.stored('Hero/Ranked', 'system.description'),
	}));

	let tall: WindowFit | undefined;
	await e2e.step("#514 A1 GM's viewport is 1400px tall, and GM opens Hero's sheet on its Skills tab", async () => {
		await gm.page.setViewportSize({ width: viewport?.width ?? 1600, height: 1400 });
		tall = await gm.evaluate(async () => {
			// A sheet opens again on the tab it was closed on.
			await window.sheetsE2E.open('Hero');
			await window.sheetsE2E.clickTab('Hero', 'skills');
			return window.sheetHeightsE2E.reopen('Hero', '.tab[data-tab="skills"] .experience');
		});
	});
	e2e.log('#514 A1 Hero at a tall viewport', tall);
	e2e.expect(
		"#514 A1 the character's sheet opens taller than the former 640px, its whole Skills tab shown, its Experience included, without scrolling",
		tall && { taller: tall.height > 640, scrolls: tall.scrolls, lastShown: tall.lastShown, onScreen: tall.onScreen },
		{ taller: true, scrolls: false, lastShown: true, onScreen: true },
	);

	let short: WindowFit | undefined;
	// Foundry warns on a screen lower than 768px.
	await e2e.step("#514 A2 GM's viewport is 800px tall, and GM opens Hero's sheet again, then scrolls it to its bottom", async () => {
		await gm.page.setViewportSize({ width: viewport?.width ?? 1600, height: 800 });
		short = await gm.evaluate(() => window.sheetHeightsE2E.reopen('Hero', '.tab[data-tab="skills"] .experience', true));
	});
	e2e.log('#514 A2 Hero at a short viewport', short);
	e2e.expect(
		"#514 A2 the character's sheet opens as tall as Foundry lets a window be, within the viewport, and scrolls to its Experience",
		short && {
			atCeiling: Math.abs(short.height - short.ceiling) <= 1,
			onScreen: short.onScreen,
			scrolls: short.scrolls,
			lastShown: short.lastShown,
		},
		{ atCeiling: true, onScreen: true, scrolls: true, lastShown: true },
	);
	await gm.page.setViewportSize(viewport ?? { width: 1600, height: 1000 });
	await e2e.settle();

	let brief: WindowFit | undefined;
	await e2e.step('#514 A3 GM gives the talent a description of two lines, and opens its sheet', async () => {
		brief = await gm.evaluate(async (description) => {
			await window.sheetsE2E.update('talent', { 'system.description': description });
			return window.sheetHeightsE2E.reopen('talent', '.tab[data-tab="description"] prose-mirror p');
		}, twoLines);
	});
	e2e.log('#514 A3 a talent of two lines', brief);
	// Since #624, an item sheet opens no lower than 440px: the talent's height is #624 A1's.
	e2e.expect(
		'#514 A3 a talent of two lines opens no lower than its 200px minimum, its description shown whole',
		brief && { aboveMinimum: brief.height >= 200, scrolls: brief.scrolls, lastShown: brief.lastShown },
		{ aboveMinimum: true, scrolls: false, lastShown: true },
	);

	// §#624: an item sheet opens at 560×440 when its content is lower, so that the tab shown next, as a talent's Effects,
	// fits too; Archetype and Career keep their own width. The window can still be resized lower by hand.
	let opened: { width: number; height: number; effectsScroll: boolean; lastCategoryShown: boolean } | undefined;
	await e2e.step('#624 A1 GM opens the sheet of the talent of two lines, then shows its Effects tab', async () => {
		opened = await gm.evaluate(async () => {
			await window.sheetHeightsE2E.reopen('talent', '.tab[data-tab="description"] prose-mirror p');
			await window.sheetsE2E.clickTab('talent', 'effects');
			await window.e2e.settle();
			const element = window.e2e.htmlOf(game.items.getName('E2E talent').sheet)!;
			const content = element.querySelector<HTMLElement>('.window-content')!;
			const categories = content.querySelectorAll('.tab[data-tab="effects"] .effects-category');
			const last = categories[categories.length - 1].getBoundingClientRect();
			const shown = content.getBoundingClientRect();
			const box = element.getBoundingClientRect();
			// The steps after open the talent on its description.
			await window.sheetsE2E.clickTab('talent', 'description');
			return {
				width: Math.round(box.width),
				height: Math.round(box.height),
				effectsScroll: content.scrollHeight - content.clientHeight > 1,
				lastCategoryShown: last.top >= shown.top - 0.5 && last.bottom <= shown.bottom + 0.5,
			};
		});
	});
	e2e.log('#624 A1 the talent of two lines', opened);
	e2e.expect('#624 A1 a talent of two lines opens at 560×440, and its Effects tab shows its three categories without scrolling', opened, {
		width: 560,
		height: 440,
		effectsScroll: false,
		lastCategoryShown: true,
	});

	let widths: Record<string, number> = {};
	await e2e.step("#624 A2 GM opens the archetype's and the career's sheets", async () => {
		widths = await gm.evaluate(async () => {
			const width = async (name: string) => {
				await window.sheetHeightsE2E.reopen(name, '.vue-app');
				return Math.round(window.e2e.htmlOf(game.items.getName(`E2E ${name}`).sheet)!.getBoundingClientRect().width);
			};
			return { archetype: await width('archetype'), career: await width('career') };
		});
	});
	e2e.expect("#624 A2 the archetype's and the career's sheets keep their own width", widths, { archetype: 720, career: 500 });

	let lowered: number | undefined;
	await e2e.step("#624 A3 GM resizes the talent's sheet to 300px by hand", async () => {
		lowered = await gm.evaluate(async () => {
			await window.sheetHeightsE2E.reopen('talent', '.tab[data-tab="description"] prose-mirror p');
			game.items.getName('E2E talent').sheet.setPosition({ height: 300 });
			return window.sheetHeightsE2E.height('talent');
		});
	});
	e2e.expect("#624 A3 an item sheet's 440px opening height doesn't keep it from being resized lower by hand", lowered, 300);

	let long: WindowFit | undefined;
	await e2e.step('#514 A4 GM gives the talent a description of twelve paragraphs, and opens its sheet', async () => {
		long = await gm.evaluate(async (description) => {
			await window.sheetsE2E.update('talent', { 'system.description': description });
			return window.sheetHeightsE2E.reopen('talent', '.tab[data-tab="description"] prose-mirror p:last-of-type');
		}, longDescription);
	});
	e2e.log('#514 A4 a talent of twelve paragraphs', long);
	e2e.expect(
		'#514 A4 a talent with a long description opens taller than the former 300px, its last line shown without scrolling',
		long && { taller: long.height > 300, scrolls: long.scrolls, lastShown: long.lastShown },
		{ taller: true, scrolls: false, lastShown: true },
	);

	let forgotten: { resized: number; reopened: number } | undefined;
	await e2e.step("#514 A5 GM resizes the talent's sheet to 500px by hand, closes it and opens it again", async () => {
		forgotten = await gm.evaluate(async () => {
			const app = game.items.getName('E2E talent').sheet;
			app.setPosition({ height: 500 });
			const resized = window.sheetHeightsE2E.height('talent');
			const reopened = await window.sheetHeightsE2E.reopen('talent', '.tab[data-tab="description"] prose-mirror p:last-of-type');
			return { resized, reopened: reopened.height };
		});
	});
	e2e.expect(
		"#514 A5 a sheet resized by hand opens again at its content's height",
		forgotten && { resized: forgotten.resized, reopened: forgotten.reopened },
		{ resized: 500, reopened: long?.height },
	);

	let floor: WindowFit | undefined;
	await e2e.step("#514 A6 GM opens the minion's sheet, which holds little", async () => {
		floor = await gm.evaluate(() => window.sheetHeightsE2E.reopen('Minion', '.vue-app'));
	});
	e2e.log('#514 A6 the minion', floor);
	e2e.expect("#514 A6 an actor's sheet with little content opens at its 600px minimum", floor?.height, 600);

	let kept: Awaited<ReturnType<SheetHeightHelpers['tabThenTalent']>> | undefined;
	await e2e.step(
		"#514 A7 GM gives Hero's Ranked talent a long description, opens Hero's sheet, shows its Talents tab, then opens the talent's description",
		async () => {
			kept = await gm.evaluate(async (description) => {
				await window.sheetsE2E.update('Hero/Ranked', { 'system.description': description });
				await window.sheetsE2E.open('Hero');
				await window.sheetsE2E.clickTab('Hero', 'skills');
				await window.sheetHeightsE2E.reopen('Hero', '.tab[data-tab="skills"] .experience');
				return window.sheetHeightsE2E.tabThenTalent('Hero', 'talents');
			}, longDescription);
		},
	);
	e2e.expect(
		"#514 A7 switching the character's tab, then opening a talent's description, leaves the window's height as it opened",
		kept && { tab: kept.tab, talent: kept.talent, expanded: kept.expanded },
		{ tab: kept?.opened, talent: kept?.opened, expanded: true },
	);

	const types = await gm.evaluate(() => ['Hero', 'Minion', 'Rival', 'Nemesis', 'Vehicle', ...Object.keys(CONFIG.Item.dataModels)]);
	let opening: Record<string, WindowFit> = {};
	await e2e.step('#514 A8 GM opens the sheet of each actor and item type', async () => {
		opening = await gm.evaluate(async (types) => {
			const fits: Record<string, WindowFit> = {};
			for (const name of types) {
				fits[name] = await window.sheetHeightsE2E.reopen(name, '.vue-app');
				await window.sheetsE2E.close(name);
			}
			return fits;
		}, types);
	});
	e2e.log('#514 A8 opening heights', Object.fromEntries(Object.entries(opening).map(([name, fit]) => [name, fit.height])));
	e2e.expect(
		'#514 A8 the sheet of each actor and item type opens showing its whole content without scrolling',
		Object.fromEntries(Object.entries(opening).map(([name, fit]) => [name, fit.scrolls ? 'scrolls' : 'whole'])),
		Object.fromEntries(types.map((name) => [name, 'whole'])),
	);

	// §#529: an item sheet opens no taller than 75% of the viewport; taller content scrolls. At the scenario's 1000px
	// viewport, the twelve paragraphs of #514 A4 fit within it.
	const screenfulDescription = Array.from(
		{ length: 60 },
		(_, index) => `<p>Line ${index + 1} of a description taller than the screen.</p>`,
	).join('');
	let capped: (WindowFit & { cap: number }) | undefined;
	await e2e.step(
		'#529 A1 GM gives the talent a description taller than 75% of the viewport, opens its sheet, then scrolls it to its bottom',
		async () => {
			capped = await gm.evaluate(async (description) => {
				await window.sheetsE2E.update('talent', { 'system.description': description });
				const fit = await window.sheetHeightsE2E.reopen('talent', '.tab[data-tab="description"] prose-mirror p:last-of-type', true);
				return { ...fit, cap: Math.round(window.innerHeight * 0.75) };
			}, screenfulDescription);
		},
	);
	e2e.log('#529 A1 a talent taller than 75% of the viewport', capped);
	e2e.expect(
		"#529 A1 a talent taller than 75% of the viewport opens at 75% of the viewport's height, and scrolls to its last line",
		capped && { atCap: Math.abs(capped.height - capped.cap) <= 1, scrolls: capped.scrolls, lastShown: capped.lastShown },
		{ atCap: true, scrolls: true, lastShown: true },
	);

	let floored: (WindowFit & { cap: number }) | undefined;
	// The lowest viewport Foundry doesn't warn about, 768px, puts 75% of it, 576px, below the archetype's 600px minimum
	// (ArchetypeSheet.scss).
	await e2e.step("#529 A2 GM's viewport is 768px tall, and GM opens the archetype's sheet", async () => {
		await gm.page.setViewportSize({ width: viewport?.width ?? 1600, height: 768 });
		floored = await gm.evaluate(async () => {
			const fit = await window.sheetHeightsE2E.reopen('archetype', '.vue-app');
			return { ...fit, cap: Math.round(window.innerHeight * 0.75) };
		});
	});
	e2e.log('#529 A2 the archetype at a short viewport', floored);
	e2e.expect(
		"#529 A2 where 75% of the viewport falls below an item sheet's minimum, the sheet opens at its minimum",
		floored && { belowMinimum: floored.cap < 600, height: floored.height },
		{ belowMinimum: true, height: 600 },
	);
	await gm.page.setViewportSize(viewport ?? { width: 1600, height: 1000 });
	await e2e.settle();

	await gm.evaluate(async (stored) => {
		await window.sheetsE2E.update('talent', { 'system.description': stored.talent });
		await window.sheetsE2E.update('Hero/Ranked', { 'system.description': stored.ranked });
		await window.sheetsE2E.closeAll();
	}, stored);
}
