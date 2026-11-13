import type { ScenarioContext } from '../../scenario.ts';

/**
 * §#517: the Story Point tracker is one pill at the top of the screen beside the sidebar, expanded or collapsed, clear
 * of the chat input and of the hotbar, on a wide screen as on a narrow one.
 */
export async function storyPointTrackerPlace(e2e: ScenarioContext) {
	const { gm } = e2e;
	const place = (collapsed: boolean) =>
		gm.evaluate(async (collapsed) => {
			// The chat tab, whose input then sits in the sidebar while it is expanded, and floats beside it once collapsed.
			ui.sidebar.changeTab('chat', 'primary');
			if (collapsed) ui.sidebar.collapse();
			else ui.sidebar.expand();
			// The sidebar slides as it expands or collapses.
			await window.e2e.sleep(1000);
			const element = document.getElementById('story-point-tracker')!;
			const tracker = element.getBoundingClientRect();
			const sidebar = document.getElementById('sidebar')!.getBoundingClientRect();
			const overlaps = (other?: Element | null) => {
				const box = other?.getBoundingClientRect();
				return (
					!!box &&
					box.width > 0 &&
					box.left < tracker.right &&
					box.right > tracker.left &&
					box.top < tracker.bottom &&
					box.bottom > tracker.top
				);
			};
			const pools = [...element.querySelectorAll('.pool')];
			const centre = document.elementFromPoint(tracker.left + tracker.width / 2, tracker.top + tracker.height / 2);
			return {
				column: element.parentElement?.id,
				gapToSidebar: Math.round(sidebar.left - tracker.right),
				gapToTop: Math.round(tracker.top),
				height: Math.round(tracker.height),
				sideBySide: pools.length === 2 && pools[0].getBoundingClientRect().right <= pools[1].getBoundingClientRect().left,
				coversChatInput: [...document.querySelectorAll('#chat-message')].some(overlaps),
				coversHotbar: overlaps(document.getElementById('hotbar')),
				labels: pools.map((pool) => window.e2e.text(pool.querySelector('header'))),
				tooltips: pools.map((pool) => pool.getAttribute('data-tooltip')),
				clickable: element.contains(centre),
			};
		}, collapsed);
	type Place = Awaited<ReturnType<typeof place>>;
	const places: Record<string, Place> = {};
	await e2e.step('#517 A1 GM expands the sidebar, then collapses it, on a wide screen and on a narrow one', async () => {
		for (const [screen, viewport] of [
			['wide', { width: 1600, height: 1000 }],
			['narrow', { width: 1100, height: 800 }],
		] as const) {
			await gm.page.setViewportSize(viewport);
			places[`${screen} expanded`] = await place(false);
			places[`${screen} collapsed`] = await place(true);
		}
		await gm.page.setViewportSize({ width: 1600, height: 1000 });
	});
	e2e.log('#517 places', places);
	// Foundry's right-hand interface spaces its columns by 16px, and its column beside the sidebar starts 16px below the
	// top of the screen, level with the sidebar's first tab.
	const pill = (laidOut: Place) => ({
		column: laidOut.column,
		besideSidebar: laidOut.gapToSidebar >= 0 && laidOut.gapToSidebar <= 20,
		atTop: laidOut.gapToTop >= 0 && laidOut.gapToTop <= 20,
		compact: laidOut.sideBySide && laidOut.height <= 70,
		coversChatInput: laidOut.coversChatInput,
		coversHotbar: laidOut.coversHotbar,
		clickable: laidOut.clickable,
	});
	const expected = {
		column: 'ui-right-column-1',
		besideSidebar: true,
		atTop: true,
		compact: true,
		coversChatInput: false,
		coversHotbar: false,
		clickable: true,
	};
	e2e.expect(
		'#517 A1 the Story Point tracker is one pill at the top beside the sidebar, expanded or collapsed, clear of the chat input and the hotbar, and takes clicks',
		Object.fromEntries(Object.entries(places).map(([layout, laidOut]) => [layout, pill(laidOut)])),
		Object.fromEntries(['wide expanded', 'wide collapsed', 'narrow expanded', 'narrow collapsed'].map((layout) => [layout, expected])),
	);
	e2e.expect(
		'#517 A2 the pill shows each pool under its short label, its full label in its tooltip',
		{ labels: places['wide expanded']?.labels, tooltips: places['wide expanded']?.tooltips },
		{ labels: ['GM', 'Players'], tooltips: ['GM Story Points', 'Player Story Points'] },
	);
	await gm.evaluate(() => ui.sidebar.expand());
}
