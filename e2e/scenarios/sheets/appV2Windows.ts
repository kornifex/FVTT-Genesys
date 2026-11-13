import type { SheetsContext } from './shared.ts';



export async function appV2WindowsPart(ctx: SheetsContext, actorTypes: string[], itemTypes: string[]) {
	const { e2e, gm } = ctx;
	const windows: Record<string, unknown> = {};
	let header: unknown;
	await e2e.step('#95 GM opens each actor and item sheet', async () => {
		for (const name of [...actorTypes, ...itemTypes]) {
			windows[name] = await gm.evaluate((name) => window.sheetsE2E.open(name), name);
			if (name === 'Hero') header = await gm.evaluate(() => window.sheetsE2E.header('Hero'));
			await gm.evaluate((name) => window.sheetsE2E.close(name), name);
		}
	});
	const titled = (title: string) => ({ appV2: true, title, headerTitle: title });
	e2e.expect(
		'#95 A1 every actor sheet is an ApplicationV2 window titled "<type>: <name>"',
		Object.fromEntries(actorTypes.map((name) => [name, windows[name]])),
		{
			Hero: titled('Character: E2E Hero'),
			Minion: titled('Minion: E2E Minion'),
			Rival: titled('Rival: E2E Rival'),
			Nemesis: titled('Nemesis: E2E Nemesis'),
			Vehicle: titled('Vehicle: E2E Vehicle'),
		},
	);
	const itemLabels = await gm.evaluate(
		(types) => Object.fromEntries(types.map((type) => [type, game.i18n.localize(CONFIG.Item.typeLabels[type])])),
		itemTypes,
	);
	e2e.expect(
		'#95 A2 every item sheet is an ApplicationV2 window titled "<type>: <name>"',
		Object.fromEntries(itemTypes.map((type) => [type, windows[type]])),
		Object.fromEntries(itemTypes.map((type) => [type, titled(`${itemLabels[type]}: E2E ${type}`)])),
	);
	e2e.log('item type labels', itemLabels);

	// v13: core's header has no ownership or detach entry, which v14's ApplicationV2 header adds to the controls menu.
	const headerControls =
		e2e.version < 14
			? ['configurePrototypeToken', 'configureSheet', 'showPortraitArtwork', 'showTokenArtwork']
			: ['configureOwnership', 'configurePrototypeToken', 'configureSheet', 'detach', 'showPortraitArtwork', 'showTokenArtwork'];
	e2e.expect(
		'#95 A3 the AppV2 header holds the controls menu, with the prototype token and artwork entries, and the copy-UUID and sheet-config buttons',
		header,
		{ buttons: ['close', 'copyUuid', 'toggleControls'], controls: headerControls },
	);
}
