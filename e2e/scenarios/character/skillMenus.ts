import type { ScenarioContext } from '../../scenario.ts';
import type { Evaluate } from './shared.ts';

/** §#647: a skill's open menu shows over every row of the Skills tab, opened down from its ⋮ or up at the pointer. */
export async function skillMenus(e2e: ScenarioContext, page: Evaluate) {
	const S = 'Stacked';
	await e2e.step('#647 a character with XP to spend and characteristics of 2, its sheet open on the Skills tab', () =>
		page(async (name) => {
			await Actor.create({
				name: `E2E ${name}`,
				type: 'character',
				system: {
					characteristics: { brawn: 2, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2 },
					experienceJournal: { entries: [{ amount: 200, type: 'Starting', data: {} }] },
				},
			});
			await window.characterE2E.open(name);
			await window.e2e.showTab(name, 'skills');
		}, S),
	);

	// Opens a skill's menu, then reads what shows on top at points spread over the menu's box, and, once it is closed, what
	// the menu covered there: rows with their ↑ and their dice.
	const menuOver = (opening: 'down' | 'up') =>
		page(
			async ({ name, opening }) => {
				const { actor, htmlOf, settle, waitFor } = window.e2e;
				const root = htmlOf(actor(name).sheet)!;
				const rows = [...root.querySelectorAll<HTMLElement>('.tab-skills .skill.row')];
				const content = root.querySelector('.window-content')!.getBoundingClientRect();
				// Down: the first skill, from its ⋮. Up: at the pointer, on the last skill of the first column that shows whole,
				// with no room below it for the menu.
				const firstColumn = rows.filter((row) => row.getBoundingClientRect().left === rows[0].getBoundingClientRect().left);
				const row =
					opening === 'down'
						? rows[0]
						: firstColumn.filter((row) => row.getBoundingClientRect().bottom < content.bottom - 2).at(-1)!;
				const rowBox = row.getBoundingClientRect();
				const pointer = { x: row.querySelector('.skill-name')!.getBoundingClientRect().right - 20, y: rowBox.bottom - 2 };
				if (opening === 'down') row.querySelector<HTMLElement>(':scope > .menu-trigger')!.click();
				else
					row.querySelector('.skill-name')!.dispatchEvent(
						new MouseEvent('contextmenu', {
							bubbles: true,
							cancelable: true,
							button: 2,
							clientX: pointer.x,
							clientY: pointer.y,
						}),
					);
				const menu = await waitFor('the skill menu', () => row.querySelector<HTMLElement>(':scope > [role="menu"]'));
				await settle();

				const box = menu.getBoundingClientRect();
				// A grid over the menu, and the middle of each part of an ↑ or a die it covers.
				const grid = [0.05, 0.25, 0.5, 0.75, 0.95].flatMap((x) =>
					[0.05, 0.15, 0.25, 0.35, 0.5, 0.65, 0.75, 0.85, 0.95].map((y) => ({
						x: box.left + box.width * x,
						y: box.top + box.height * y,
					})),
				);
				const covered = [...root.querySelectorAll('.tab-skills .buy-rank, .tab-skills .skill-ranks .rank')].flatMap((element) => {
					const part = element.getBoundingClientRect();
					const left = Math.max(part.left, box.left);
					const right = Math.min(part.right, box.right);
					const top = Math.max(part.top, box.top);
					const bottom = Math.min(part.bottom, box.bottom);
					return right - left > 1 && bottom - top > 1
						? [{ kind: element.matches('.buy-rank') ? 'rank ↑' : 'dice', x: (left + right) / 2, y: (top + bottom) / 2 }]
						: [];
				});
				const named = (element: Element | null) => {
					if (!element) return 'nothing';
					if (element.closest('.buy-rank')) return 'rank ↑';
					if (element.closest('.skill-ranks')) return 'dice';
					return [element.tagName.toLowerCase(), ...element.classList].join('.');
				};
				const over = [...grid, ...covered]
					.map(({ x, y }) => document.elementFromPoint(x, y))
					.filter((element) => !menu.contains(element));

				document.body.click();
				await waitFor('the skill menu to close', () => !menu.isConnected);
				return {
					direction: opening === 'down' ? box.top >= rowBox.bottom - 1 : box.bottom <= pointer.y + 1,
					covers: ['dice', 'rank ↑'].filter((kind) => covered.some((part) => part.kind === kind)),
					over: [...new Set(over.map(named))],
				};
			},
			{ name: S, opening },
		);

	let down = {};
	await e2e.step("#647 A1 the first skill's menu opened from its ⋮", async () => {
		down = await menuOver('down');
	});
	e2e.expect(
		"#647 A1 a skill's menu opened from its ⋮ shows below it, over the ↑ and the dice of the rows below, nothing over it",
		down,
		{ direction: true, covers: ['dice', 'rank ↑'], over: [] },
	);
	let up = {};
	await e2e.step("#647 A2 the menu of the first column's last whole skill opened at the pointer, on its bottom edge", async () => {
		up = await menuOver('up');
	});
	e2e.expect(
		"#647 A2 a skill's menu opened at the pointer with no room below shows above it, over the ↑ and the dice of the rows above, nothing over it",
		up,
		{ direction: true, covers: ['dice', 'rank ↑'], over: [] },
	);
	await page((name) => window.characterE2E.close(name), S);

	// A characteristic's menu hangs from a container laid out as `display: contents`, which has no box of its own.
	const C = 'Superior';
	let superMenu = {};
	await e2e.step("#647 A3 Super-Characteristics on, a character in Character Creation opens Brawn's menu from its ⋮", async () => {
		await page(async (name) => {
			await window.e2e.setSettings({ useSuperCharacteristics: true });
			await window.characterE2E.create(name);
			await window.characterE2E.open(name);
			await window.characterE2E.applyArchetype(name, 'Small Archetype');
			await window.e2e.showTab(name, 'skills');
		}, C);
		superMenu = await page(async (name) => {
			const { actor, htmlOf, settle, text, waitFor } = window.e2e;
			const root = htmlOf(actor(name).sheet)!;
			const field = root.querySelector<HTMLElement>('.tab-skills .characteristic-field')!;
			const container = field.querySelector<HTMLElement>('.menu-container')!;
			container.querySelector<HTMLElement>(':scope > .menu-trigger')!.click();
			const menu = await waitFor("Brawn's menu", () => container.querySelector<HTMLElement>(':scope > [role="menu"]'));
			await settle();

			const box = menu.getBoundingClientRect();
			const around = field.getBoundingClientRect();
			const over = [0.05, 0.25, 0.5, 0.75, 0.95]
				.flatMap((x) =>
					[0.1, 0.3, 0.5, 0.7, 0.9].map((y) => document.elementFromPoint(box.left + box.width * x, box.top + box.height * y)),
				)
				.filter((element) => !menu.contains(element))
				.map((element) => (element ? [element.tagName.toLowerCase(), ...element.classList].join('.') : 'nothing'));
			const entries = [...menu.querySelectorAll('.menu-label')].map((label) => text(label));
			document.body.click();
			await waitFor("Brawn's menu to close", () => !menu.isConnected);
			return {
				entries,
				// Across the characteristic's box, its top edge between the box's top and just under its bottom.
				nextToIt: box.right > around.left && box.left < around.right && box.top >= around.top && box.top <= around.bottom + 4,
				over: [...new Set(over)],
			};
		}, C);
	});
	e2e.expect("#647 A3 a characteristic's menu opened from its ⋮ shows next to its characteristic, with nothing over it", superMenu, {
		entries: [await page(() => game.i18n.localize('Genesys.Labels.MarkSuperCharacteristic'), undefined)],
		nextToIt: true,
		over: [],
	});
	await page(async (name) => {
		await window.characterE2E.close(name);
		await window.e2e.setSettings({ useSuperCharacteristics: false });
	}, C);
}
