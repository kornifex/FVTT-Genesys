import type { SheetsContext } from './shared.ts';

export async function magicPart(ctx: SheetsContext) {
	const { e2e, gm } = ctx;
	// The Mage's sheet: its tabs, and the Magic tab entries of its window's menu, as v13 renders them and as either
	// version builds them; the Magic tab's rows.
	const mageSheet = () =>
		gm.evaluate(async () => {
			const mage = game.actors.getName('E2E Mage');
			const root = await window.e2e.render(mage.sheet);
			const text = (element: Element | null) => element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
			const magicEntries = (actions: string[]) => actions.filter((action) => action.endsWith('MagicTab'));
			const frame: HTMLElement = mage.sheet.element;
			return {
				tabs: [...root.querySelectorAll<HTMLElement>('nav.sheet-tabs [data-tab]')].map((tab) => tab.dataset.tab),
				menu: magicEntries([...mage.sheet._headerControlButtons()].map((control: { action: string }) => control.action)),
				// v13 renders the menu in the window's header; v14 builds it each time it opens.
				renderedMenu: magicEntries(
					[...frame.querySelectorAll<HTMLElement>('.controls-dropdown [data-action]')].map((entry) => entry.dataset.action!),
				),
				spells: [...root.querySelectorAll('.tab-magic .spell:not(.header)')].map((row) => ({
					name: text(row.querySelector('.name')),
					action: text(row.querySelector('.action')),
					effects: [...row.querySelectorAll('.additional-effects li')].map((effect) => text(effect.firstChild as Element)),
				})),
			};
		});
	const dropOn = (target: { actor?: string; item?: string }, dropped: string) =>
		gm.evaluate(
			async ({ target, dropped }) => {
				const document = target.actor ? game.actors.getName(target.actor) : game.items.getName(target.item!);
				const root = await window.e2e.render(document.sheet, (root) => root.querySelector('.window-content'));
				window.e2e.drop(root.querySelector('.window-content')!, { type: 'Item', uuid: game.items.getName(dropped).uuid });
				await window.e2e.settle();
			},
			{ target, dropped },
		);

	await e2e.step('#704 M1 GM creates the character E2E Mage, without a rank in a magic skill nor a spell, and opens their sheet', () =>
		gm.evaluate(async () => {
			await window.sheetsE2E.closeAll();
			await Actor.createDocuments([{ name: 'E2E Mage', type: 'character' }]);
		}),
	);
	const withoutMagic = await mageSheet();
	e2e.expect(
		'#704 M1 a character without a rank in a magic skill nor a spell has no Magic tab, and their window offers no Magic tab entry',
		{ magicTab: withoutMagic.tabs.includes('magic'), menu: withoutMagic.menu },
		{ magicTab: false, menu: [] },
	);

	await e2e.step("#704 M2 GM picks Attack in the action of the world's E2E spell", () =>
		gm.evaluate(async () => {
			const sheets = window.sheetsE2E;
			await sheets.open('spell');
			await sheets.clickTab('spell', 'data');
			await sheets.changeField('spell', '.spell-action', 'attack');
		}),
	);
	e2e.expect(
		'#704 M2 picking Attack fills Easy, an attack, and Arcana, Divine and Primal (CRB p. 215)',
		await gm.evaluate(() => {
			const { action, difficulty, isAttack, skills } = game.items.getName('E2E spell').system;
			return { action, difficulty, isAttack, skills: [...skills] };
		}),
		{ action: 'attack', difficulty: 1, isAttack: true, skills: ['Arcana', 'Divine', 'Primal'] },
	);

	await e2e.step("#704 M3 GM drops the world's E2E quality on the E2E additionalEffect, then the effect twice on the spell", async () => {
		await dropOn({ item: 'E2E additionalEffect' }, 'E2E quality');
		await dropOn({ item: 'E2E spell' }, 'E2E additionalEffect');
		await dropOn({ item: 'E2E spell' }, 'E2E additionalEffect');
	});
	e2e.expect(
		"#704 M3 the effect gives the rated quality at the caster's ranks in Knowledge, and the spell lists the effect twice, with it, under two ids",
		await gm.evaluate(() => {
			const spell = game.items.getName('E2E spell');
			type Effect = { id: string; name: string; qualities: { name: string; ratingSource: string; ratingSkill: string }[] };
			const effects: Effect[] = spell.system.additionalEffects;
			return {
				effects: effects.map((effect) => ({
					name: effect.name,
					qualities: effect.qualities.map(({ name, ratingSource, ratingSkill }) => `${name} ${ratingSource} ${ratingSkill}`),
				})),
				distinctIds: new Set(effects.map((effect) => effect.id)).size,
				rows: window.e2e.htmlOf(spell.sheet)!.querySelectorAll('.additional-effect').length,
			};
		}),
		{
			effects: [
				{ name: 'E2E additionalEffect', qualities: ['E2E quality skillRanks Knowledge'] },
				{ name: 'E2E additionalEffect', qualities: ['E2E quality skillRanks Knowledge'] },
			],
			distinctIds: 2,
			rows: 2,
		},
	);

	await e2e.step('#704 M4 GM drops the E2E spell on the Mage', () => dropOn({ actor: 'E2E Mage' }, 'E2E spell'));
	const withSpell = await mageSheet();
	e2e.expect(
		'#704 M4 the Mage owns the spell, which their Magic tab lists after Talents, with its action and its two additional effects',
		{ tabs: withSpell.tabs, spells: withSpell.spells },
		{
			tabs: ['skills', 'combat', 'talents', 'magic', 'inventory', 'effects', 'journal'],
			spells: [{ name: 'E2E spell', action: 'Attack', effects: ['E2E additionalEffect', 'E2E additionalEffect'] }],
		},
	);
	e2e.expect(
		"#757 M4 the difficulty glyphs of the Mage's Magic tab and of the spell's sheet use the dice font, in the Difficulty colour",
		await gm.evaluate(async () => {
			const mage = await window.e2e.render(game.actors.getName('E2E Mage').sheet);
			const spell = await window.e2e.render(game.items.getName('E2E spell').sheet);
			const looks = (elements: Element[]) => [
				...new Set(elements.map((element) => `${getComputedStyle(element).fontFamily}|${getComputedStyle(element).color}`)),
			];
			return {
				tab: looks([...mage.querySelectorAll('.tab-magic .spell .difficulty, .tab-magic .additional-effects li .die')]),
				sheet: looks([...spell.querySelectorAll('.additional-effect .difficulty')]),
			};
		}),
		{ tab: ['"Genesys Symbols", sans-serif|rgb(82, 35, 128)'], sheet: ['"Genesys Symbols", sans-serif|rgb(82, 35, 128)'] },
	);
	e2e.expect(
		"#762 M4 a spell's Additional Effects sit side by side on a line under the spell, from the row's left edge",
		await gm.evaluate(async () => {
			await window.sheetsE2E.open('Mage');
			await window.sheetsE2E.clickTab('Mage', 'magic');
			const row = game.actors.getName('E2E Mage').sheet.element.querySelector('.tab-magic .spell:not(.header)')!;
			const box = (selector: string) => row.querySelector(selector)!.getBoundingClientRect();
			const [first, second] = [...row.querySelectorAll('.additional-effects li')].map((effect) => effect.getBoundingClientRect());
			const effects = box('.additional-effects');
			return {
				belowSpell: effects.top >= box('.name').bottom,
				sameLine: Math.abs(first.top - second.top) < 1 && second.left > first.right,
				fromLeft: Math.abs(effects.left - row.getBoundingClientRect().left) < 32,
			};
		}),
		{ belowSpell: true, sameLine: true, fromLeft: true },
	);
	e2e.expect(
		"#704 M4 the Mage's window offers to hide the Magic tab",
		{ menu: withSpell.menu, renderedMenu: withSpell.renderedMenu },
		{ menu: ['hideMagicTab'], renderedMenu: e2e.version < 14 ? ['hideMagicTab'] : [] },
	);

	// The entry's own click, as the menu's item calls it on either version.
	const clickMenuEntry = (action: string) =>
		gm.evaluate(async (action) => {
			const sheet = game.actors.getName('E2E Mage').sheet;
			const control = [...sheet._headerControlButtons()].find((entry: { action: string }) => entry.action === action);
			if (!control) throw new Error(`No ${action} entry in the Mage's window menu`);
			await control.onClick(new PointerEvent('click'));
			await window.e2e.settle();
		}, action);
	await e2e.step("#704 M5 GM clicks Hide the Magic Tab in the Mage's window menu", () => clickMenuEntry('hideMagicTab'));
	const hidden = await mageSheet();
	e2e.expect(
		'#704 M5 the Magic tab is hidden, and the menu offers to show it again',
		{ magicTab: hidden.tabs.includes('magic'), menu: hidden.menu, renderedMenu: hidden.renderedMenu },
		{ magicTab: false, menu: ['showMagicTab'], renderedMenu: e2e.version < 14 ? ['showMagicTab'] : [] },
	);
	await e2e.step("#704 M6 GM clicks Show the Magic Tab in the Mage's window menu", () => clickMenuEntry('showMagicTab'));
	e2e.expect('#704 M6 the Magic tab is back', (await mageSheet()).tabs.includes('magic'), true);

	await gm.evaluate(() => window.sheetsE2E.closeAll());
}
