/**
 * @file Tests for the drops an actor's inventory receives and for its Containers.
 */

import { describe, expect, it } from 'vitest';

import {
	containerContents,
	decideDrop,
	heldByDeletedContainers,
	InventoryItem,
	containerStateUpdates,
	equipmentStateMoves,
	equipmentStateUpdates,
	equipmentStep,
	rowDropTarget,
	rowEdge,
	sectionItems,
	wornArmor,
} from '@/actor/data/Inventory';
import { EquipmentDamageState } from '@/item/data/EquipmentDamage';
import { EquipmentState } from '@/item/data/EquipmentState';

function item(id: string, type: string, state: EquipmentState = EquipmentState.Carried, sort = 0, container = ''): InventoryItem {
	return { id, type, sort, system: { state, container } };
}

// Ids for the created items, in order.
function newIds() {
	let count = 0;
	return () => `new${++count}`;
}

describe('decideDrop', () => {
	it('copies an item from a compendium or the sidebar, carried', () => {
		const pc = { uuid: 'Actor.pc', type: 'character', items: [] };

		const decision = decideDrop(pc, { item: item('sword', 'weapon', EquipmentState.Equipped), at: { kind: 'sheet' } }, newIds());

		expect(decision).toEqual({
			action: 'copy',
			create: [{ sourceId: 'sword', _id: 'new1', sort: 100000, system: { state: EquipmentState.Carried, container: '' } }],
			update: [],
			delete: [],
		});
	});

	it("moves an item from an actor the user owns to the end of the receiver's Carried section", () => {
		const pc = { uuid: 'Actor.pc', type: 'character', items: [item('rope', 'gear', EquipmentState.Carried, 300000)] };
		const sword = item('sword', 'weapon', EquipmentState.Equipped);
		const ally = { uuid: 'Actor.ally', isOwner: true, items: [sword] };

		const decision = decideDrop(pc, { item: sword, from: ally, at: { kind: 'sheet' } }, newIds());

		expect(decision).toEqual({
			action: 'move',
			create: [{ sourceId: 'sword', _id: 'new1', sort: 400000, system: { state: EquipmentState.Carried, container: '' } }],
			update: [],
			delete: ['sword'],
		});
	});

	it("refuses an item from an actor the user doesn't own", () => {
		const pc = { uuid: 'Actor.pc', type: 'character', items: [] };
		const sword = item('sword', 'weapon');
		const stranger = { uuid: 'Actor.stranger', isOwner: false, items: [sword] };

		expect(decideDrop(pc, { item: sword, from: stranger, at: { kind: 'sheet' } }, newIds())).toEqual({ action: 'refuse' });
	});

	it("refuses an item that isn't equipment for the receiver", () => {
		const pc = { uuid: 'Actor.pc', type: 'character', items: [] };

		expect(decideDrop(pc, { item: item('cannon', 'vehicleWeapon'), at: { kind: 'sheet' } }, newIds())).toEqual({ action: 'refuse' });
		expect(decideDrop(pc, { item: item('grit', 'talent'), at: { kind: 'sheet' } }, newIds())).toEqual({ action: 'refuse' });
	});

	it("gives a dropped item the section's Equipment State and sorts it after the slot's item", () => {
		const pc = {
			uuid: 'Actor.pc',
			type: 'character',
			items: [item('tent', 'gear', EquipmentState.Dropped, 100000), item('cart', 'gear', EquipmentState.Dropped, 200000)],
		};

		const decision = decideDrop(
			pc,
			{ item: item('lantern', 'gear'), at: { kind: 'section', state: EquipmentState.Dropped, after: 0 } },
			newIds(),
		);

		expect(decision).toEqual({
			action: 'copy',
			create: [{ sourceId: 'lantern', _id: 'new1', sort: 200000, system: { state: EquipmentState.Dropped, container: '' } }],
			update: [{ _id: 'cart', sort: 300000 }],
			delete: [],
		});
	});

	it('sorts an item dropped on the top slot before the first item of the section', () => {
		const pc = { uuid: 'Actor.pc', type: 'character', items: [item('rope', 'gear', EquipmentState.Carried, 100000)] };

		const decision = decideDrop(
			pc,
			{ item: item('lantern', 'gear'), at: { kind: 'section', state: EquipmentState.Carried, after: -1 } },
			newIds(),
		);

		expect(decision).toMatchObject({
			create: [{ sourceId: 'lantern', sort: 100000 }],
			update: [{ _id: 'rope', sort: 200000 }],
		});
	});

	it('equips only the items the receiver can equip', () => {
		const pc = { uuid: 'Actor.pc', type: 'character', items: [] };
		const vehicle = { uuid: 'Actor.ship', type: 'vehicle', items: [] };
		const equipped = { kind: 'section', state: EquipmentState.Equipped, after: -1 } as const;

		expect(decideDrop(pc, { item: item('sword', 'weapon'), at: equipped }, newIds())).toMatchObject({
			create: [{ system: { state: EquipmentState.Equipped } }],
		});
		expect(decideDrop(pc, { item: item('rope', 'gear'), at: equipped }, newIds())).toEqual({ action: 'refuse' });
		expect(decideDrop(vehicle, { item: item('cannon', 'vehicleWeapon'), at: equipped }, newIds())).toMatchObject({
			create: [{ system: { state: EquipmentState.Equipped } }],
		});
		expect(decideDrop(vehicle, { item: item('sword', 'weapon'), at: equipped }, newIds())).toEqual({ action: 'refuse' });
	});

	it('takes off the worn armor, to the end of the Carried section, when another armor is equipped (CRB p. 92)', () => {
		const pc = {
			uuid: 'Actor.pc',
			type: 'character',
			items: [
				item('jacket', 'armor', EquipmentState.Equipped, 100000),
				item('sword', 'weapon', EquipmentState.Equipped, 200000),
				item('rope', 'gear', EquipmentState.Carried, 100000),
			],
		};

		const decision = decideDrop(
			pc,
			{ item: item('mail', 'armor'), at: { kind: 'section', state: EquipmentState.Equipped, after: -1 } },
			newIds(),
		);

		expect(decision).toEqual({
			action: 'copy',
			create: [{ sourceId: 'mail', _id: 'new1', sort: 100000, system: { state: EquipmentState.Equipped, container: '' } }],
			update: [
				{ _id: 'sword', sort: 300000 },
				{ _id: 'jacket', sort: 200000, system: { state: EquipmentState.Carried } },
			],
			delete: [],
		});
	});

	it('takes off the worn armor when an armor from another actor with the same id is equipped (CRB p. 92)', () => {
		const pc = { uuid: 'Actor.pc', type: 'character', items: [item('jacket', 'armor', EquipmentState.Equipped, 100000)] };
		const twin = item('jacket', 'armor', EquipmentState.Equipped);
		const copy = { uuid: 'Actor.copy', isOwner: true, items: [twin] };

		const decision = decideDrop(
			pc,
			{ item: twin, from: copy, at: { kind: 'section', state: EquipmentState.Equipped, after: 0 } },
			newIds(),
		);

		expect(decision).toMatchObject({ update: [{ _id: 'jacket', system: { state: EquipmentState.Carried } }] });
	});

	it('leaves the worn armor on when a weapon is equipped or an armor goes into a Container', () => {
		const pc = {
			uuid: 'Actor.pc',
			type: 'character',
			items: [
				item('jacket', 'armor', EquipmentState.Equipped, 100000),
				item('backpack', 'container', EquipmentState.Equipped, 200000),
			],
		};
		const equipped = { kind: 'section', state: EquipmentState.Equipped, after: 1 } as const;

		expect(decideDrop(pc, { item: item('sword', 'weapon'), at: equipped }, newIds())).toMatchObject({ update: [] });
		expect(decideDrop(pc, { item: item('mail', 'armor'), at: { kind: 'container', id: 'backpack' } }, newIds())).toMatchObject({
			update: [],
		});
	});

	it("puts an item dropped into a Container in it, with the Container's Equipment State", () => {
		const pc = { uuid: 'Actor.pc', type: 'character', items: [item('bag', 'container', EquipmentState.Dropped)] };

		const decision = decideDrop(
			pc,
			{ item: item('rope', 'gear', EquipmentState.Carried, 500), at: { kind: 'container', id: 'bag' } },
			newIds(),
		);

		expect(decision).toEqual({
			action: 'copy',
			create: [{ sourceId: 'rope', _id: 'new1', sort: 500, system: { state: EquipmentState.Dropped, container: 'bag' } }],
			update: [],
			delete: [],
		});
	});

	it("refuses a Container dropped into a Container, and a drop into an item that isn't one", () => {
		const pc = { uuid: 'Actor.pc', type: 'character', items: [item('bag', 'container'), item('rope', 'gear')] };

		expect(decideDrop(pc, { item: item('chest', 'container'), at: { kind: 'container', id: 'bag' } }, newIds())).toEqual({
			action: 'refuse',
		});
		expect(decideDrop(pc, { item: item('lantern', 'gear'), at: { kind: 'container', id: 'rope' } }, newIds())).toEqual({
			action: 'refuse',
		});
	});

	it("moves a PC's equipped sword to an adversary, where it stays Carried", () => {
		const sword = item('sword', 'weapon', EquipmentState.Equipped);
		const pc = { uuid: 'Actor.pc', isOwner: true, items: [sword] };

		for (const type of ['minion', 'rival', 'nemesis']) {
			const adversary = { uuid: 'Actor.adversary', type, items: [] };

			expect(decideDrop(adversary, { item: sword, from: pc, at: { kind: 'sheet' } }, newIds())).toEqual({
				action: 'move',
				create: [{ sourceId: 'sword', _id: 'new1', sort: 100000, system: { state: EquipmentState.Carried, container: '' } }],
				update: [],
				delete: ['sword'],
			});
			expect(
				decideDrop(
					adversary,
					{ item: sword, from: pc, at: { kind: 'section', state: EquipmentState.Dropped, after: -1 } },
					newIds(),
				),
			).toMatchObject({ create: [{ system: { state: EquipmentState.Carried } }] });
		}
	});

	it("moves a Container's contents with it, in its new Equipment State", () => {
		const bag = item('bag', 'container', EquipmentState.Carried, 100000);
		const ally = {
			uuid: 'Actor.ally',
			isOwner: true,
			items: [bag, item('rope', 'gear', EquipmentState.Carried, 300, 'bag'), item('torch', 'gear', EquipmentState.Carried, 0)],
		};
		const pc = { uuid: 'Actor.pc', type: 'character', items: [] };

		const decision = decideDrop(
			pc,
			{ item: bag, from: ally, at: { kind: 'section', state: EquipmentState.Dropped, after: -1 } },
			newIds(),
		);

		expect(decision).toEqual({
			action: 'move',
			create: [
				{ sourceId: 'bag', _id: 'new1', sort: 100000, system: { state: EquipmentState.Dropped, container: '' } },
				{ sourceId: 'rope', _id: 'new2', sort: 300, system: { state: EquipmentState.Dropped, container: 'new1' } },
			],
			update: [],
			delete: ['bag', 'rope'],
		});
	});

	it('moves a Container nested in another one, from older data, with its own contents', () => {
		const bag = item('bag', 'container', EquipmentState.Carried, 100000);
		const ally = {
			uuid: 'Actor.ally',
			isOwner: true,
			items: [
				bag,
				item('pouch', 'container', EquipmentState.Carried, 0, 'bag'),
				item('coin', 'gear', EquipmentState.Carried, 0, 'pouch'),
			],
		};
		const pc = { uuid: 'Actor.pc', type: 'character', items: [] };

		const decision = decideDrop(pc, { item: bag, from: ally, at: { kind: 'sheet' } }, newIds());

		expect(decision).toMatchObject({
			create: [
				{ sourceId: 'bag', _id: 'new1', system: { container: '' } },
				{ sourceId: 'pouch', _id: 'new2', system: { container: 'new1' } },
				{ sourceId: 'coin', _id: 'new3', system: { container: 'new2' } },
			],
			delete: ['bag', 'pouch', 'coin'],
		});
	});

	it("refuses a Container holding items that aren't equipment for the receiver", () => {
		const bay = item('bay', 'container');
		const ship = { uuid: 'Actor.ship', isOwner: true, items: [bay, item('cannon', 'vehicleWeapon', EquipmentState.Carried, 0, 'bay')] };
		const pc = { uuid: 'Actor.pc', type: 'character', items: [] };

		expect(decideDrop(pc, { item: bay, from: ship, at: { kind: 'sheet' } }, newIds())).toEqual({ action: 'refuse' });
	});

	it('takes an item out of its Container when it leaves for another actor', () => {
		const rope = item('rope', 'gear', EquipmentState.Carried, 0, 'bag');
		const ally = { uuid: 'Actor.ally', isOwner: true, items: [item('bag', 'container'), rope] };
		const pc = { uuid: 'Actor.pc', type: 'character', items: [] };

		expect(decideDrop(pc, { item: rope, from: ally, at: { kind: 'sheet' } }, newIds())).toMatchObject({
			create: [{ sourceId: 'rope', system: { container: '' } }],
			delete: ['rope'],
		});
	});

	describe('within the same actor', () => {
		const NOTHING = { action: 'move', create: [], update: [], delete: [] };

		function pcWith(...items: InventoryItem[]) {
			return [
				{ uuid: 'Actor.pc', type: 'character', items },
				{ uuid: 'Actor.pc', isOwner: true, items },
			] as const;
		}

		it('sorts an item again in its section', () => {
			const tent = item('tent', 'gear', EquipmentState.Carried, 100000);
			const [pc, from] = pcWith(
				tent,
				item('cart', 'gear', EquipmentState.Carried, 200000),
				item('oar', 'gear', EquipmentState.Carried, 300000),
			);

			const decision = decideDrop(
				pc,
				{ item: tent, from, at: { kind: 'section', state: EquipmentState.Carried, after: 2 } },
				newIds(),
			);

			expect(decision).toEqual({
				action: 'move',
				create: [],
				update: [
					{ _id: 'tent', sort: 300000, system: { state: EquipmentState.Carried, container: '' } },
					{ _id: 'cart', sort: 100000 },
					{ _id: 'oar', sort: 200000 },
				],
				delete: [],
			});
		});

		it('does nothing when an item is dropped next to itself', () => {
			const cart = item('cart', 'gear', EquipmentState.Carried, 200000);
			const [pc, from] = pcWith(
				item('tent', 'gear', EquipmentState.Carried, 100000),
				cart,
				item('oar', 'gear', EquipmentState.Carried, 300000),
			);

			for (const after of [0, 1]) {
				const at = { kind: 'section', state: EquipmentState.Carried, after } as const;
				expect(decideDrop(pc, { item: cart, from, at }, newIds())).toEqual(NOTHING);
			}
		});

		it('takes the contents of a Container moved to another section along', () => {
			const bag = item('bag', 'container', EquipmentState.Carried, 100000);
			const [pc, from] = pcWith(bag, item('rope', 'gear', EquipmentState.Carried, 0, 'bag'));

			const decision = decideDrop(
				pc,
				{ item: bag, from, at: { kind: 'section', state: EquipmentState.Dropped, after: -1 } },
				newIds(),
			);

			expect(decision).toEqual({
				action: 'move',
				create: [],
				update: [
					{ _id: 'bag', sort: 100000, system: { state: EquipmentState.Dropped, container: '' } },
					{ _id: 'rope', system: { state: EquipmentState.Dropped } },
				],
				delete: [],
			});
		});

		it('takes off the worn armor when a carried armor is equipped (CRB p. 92)', () => {
			const mail = item('mail', 'armor', EquipmentState.Carried, 100000);
			const [pc, from] = pcWith(item('jacket', 'armor', EquipmentState.Equipped, 100000), mail);

			const decision = decideDrop(
				pc,
				{ item: mail, from, at: { kind: 'section', state: EquipmentState.Equipped, after: 0 } },
				newIds(),
			);

			expect(decision).toEqual({
				action: 'move',
				create: [],
				update: [
					{ _id: 'mail', sort: 200000, system: { state: EquipmentState.Equipped, container: '' } },
					{ _id: 'jacket', sort: 200000, system: { state: EquipmentState.Carried } },
				],
				delete: [],
			});
		});

		it('puts an item into a Container', () => {
			const rope = item('rope', 'gear', EquipmentState.Carried, 200000);
			const [pc, from] = pcWith(item('bag', 'container', EquipmentState.Dropped), rope);

			expect(decideDrop(pc, { item: rope, from, at: { kind: 'container', id: 'bag' } }, newIds())).toEqual({
				action: 'move',
				create: [],
				update: [{ _id: 'rope', sort: 200000, system: { state: EquipmentState.Dropped, container: 'bag' } }],
				delete: [],
			});
		});

		it('does nothing when an item is dropped into its own Container or elsewhere on the sheet', () => {
			const rope = item('rope', 'gear', EquipmentState.Carried, 0, 'bag');
			const [pc, from] = pcWith(item('bag', 'container'), rope);

			expect(decideDrop(pc, { item: rope, from, at: { kind: 'container', id: 'bag' } }, newIds())).toEqual(NOTHING);
			expect(decideDrop(pc, { item: rope, from, at: { kind: 'sheet' } }, newIds())).toEqual(NOTHING);
		});
	});
});

describe('equipmentStateUpdates', () => {
	it('puts an item in an Equipment State', () => {
		const items = [item('jacket', 'armor', EquipmentState.Equipped), item('sword', 'weapon')];

		expect(equipmentStateUpdates(items, 'sword', EquipmentState.Equipped)).toEqual([
			{ _id: 'sword', system: { state: EquipmentState.Equipped } },
		]);
	});

	it('takes off the worn armor, to the end of the Carried section, when another armor is equipped (CRB p. 92)', () => {
		const items = [
			item('jacket', 'armor', EquipmentState.Equipped, 100000),
			item('mail', 'armor', EquipmentState.Carried, 100000),
			item('rope', 'gear', EquipmentState.Carried, 200000),
		];

		expect(equipmentStateUpdates(items, 'mail', EquipmentState.Equipped)).toEqual([
			{ _id: 'mail', system: { state: EquipmentState.Equipped } },
			{ _id: 'jacket', sort: 300000, system: { state: EquipmentState.Carried } },
		]);
	});

	it("leaves the worn armor on when an armor held in a Container is equipped, as it keeps the Container's state", () => {
		const items = [
			item('jacket', 'armor', EquipmentState.Equipped),
			item('backpack', 'container'),
			item('mail', 'armor', EquipmentState.Carried, 0, 'backpack'),
		];

		expect(equipmentStateUpdates(items, 'mail', EquipmentState.Equipped)).toEqual([
			{ _id: 'mail', system: { state: EquipmentState.Equipped } },
		]);
	});
});

describe('containerStateUpdates', () => {
	it("gives a Container's contents, nested ones included, its new Equipment State", () => {
		const items = [
			item('bag', 'container', EquipmentState.Dropped),
			item('rope', 'gear', EquipmentState.Carried, 0, 'bag'),
			item('pouch', 'container', EquipmentState.Dropped, 0, 'bag'),
			item('coin', 'gear', EquipmentState.Carried, 0, 'pouch'),
			item('torch', 'gear', EquipmentState.Carried),
		];

		expect(containerStateUpdates(items, ['bag'])).toEqual([
			{ _id: 'rope', system: { state: EquipmentState.Dropped } },
			{ _id: 'coin', system: { state: EquipmentState.Dropped } },
		]);
	});

	it("gives an item changed in a Container the Container's Equipment State", () => {
		const items = [item('bag', 'container', EquipmentState.Dropped), item('rope', 'gear', EquipmentState.Equipped, 0, 'bag')];

		expect(containerStateUpdates(items, ['rope'])).toEqual([{ _id: 'rope', system: { state: EquipmentState.Dropped } }]);
	});

	it("changes nothing when the contents already share their Container's Equipment State", () => {
		const items = [item('bag', 'container'), item('rope', 'gear', EquipmentState.Carried, 0, 'bag'), item('torch', 'gear')];

		expect(containerStateUpdates(items, ['bag', 'rope', 'torch'])).toEqual([]);
	});
});

describe('heldByDeletedContainers', () => {
	it('lists what the deleted Containers held, nested contents included', () => {
		const items = [
			item('rope', 'gear', EquipmentState.Carried, 0, 'bag'),
			item('pouch', 'container', EquipmentState.Carried, 0, 'bag'),
			item('coin', 'gear', EquipmentState.Carried, 0, 'pouch'),
			item('torch', 'gear', EquipmentState.Carried, 0, 'crate'),
			item('lamp', 'gear'),
		];

		expect(heldByDeletedContainers(items, ['bag', 'lamp-stand'])).toEqual(['rope', 'pouch', 'coin']);
	});
});

describe('sectionItems', () => {
	it('lists the items of an Equipment State held in no Container, in sort order', () => {
		const sword = item('sword', 'weapon', EquipmentState.Equipped, 200000);
		const shield = item('shield', 'weapon', EquipmentState.Equipped, 100000);
		const items = [sword, item('rope', 'gear', EquipmentState.Carried, 300000), shield];

		expect(sectionItems(items, EquipmentState.Equipped)).toEqual([shield, sword]);
	});

	it('leaves out an Equipped item held in a Container, from older data or a script: it is listed in its Container', () => {
		const backpack = item('backpack', 'container', EquipmentState.Carried, 100000);
		const dagger = item('dagger', 'weapon', EquipmentState.Equipped, 200000, 'backpack');
		const items = [backpack, dagger];

		expect(sectionItems(items, EquipmentState.Equipped)).toEqual([]);
		expect(containerContents(items, 'backpack')).toEqual([dagger]);
	});
});

describe('wornArmor', () => {
	it('lists the Equipped armor held in no Container (CRB p. 92)', () => {
		const jacket = item('jacket', 'armor', EquipmentState.Equipped);
		const items = [
			jacket,
			item('mail', 'armor', EquipmentState.Carried),
			item('backpack', 'container', EquipmentState.Equipped),
			item('vest', 'armor', EquipmentState.Equipped, 0, 'backpack'),
			item('sword', 'weapon', EquipmentState.Equipped),
		];

		expect(wornArmor(items)).toEqual([jacket]);
	});
});

describe('equipmentStateMoves', () => {
	const actions = (actorType: string, held: InventoryItem) => equipmentStateMoves(actorType, held).map((move) => move.action);

	it('offers a character to equip a weapon or an armor and to drop it, and to put an equipped one back to Carried', () => {
		expect(equipmentStateMoves('character', item('sword', 'weapon', EquipmentState.Carried))).toEqual([
			{ action: 'equip', state: EquipmentState.Equipped },
			{ action: 'drop', state: EquipmentState.Dropped },
		]);
		expect(equipmentStateMoves('character', item('coat', 'armor', EquipmentState.Equipped))).toEqual([
			{ action: 'unequip', state: EquipmentState.Carried },
			{ action: 'drop', state: EquipmentState.Dropped },
		]);
	});

	it('offers a character to pick up a dropped item, and to equip it at once when it can be equipped', () => {
		expect(actions('character', item('rope', 'gear', EquipmentState.Dropped))).toEqual(['pickUp']);
		expect(actions('character', item('sword', 'weapon', EquipmentState.Dropped))).toEqual(['equip', 'pickUp']);
		expect(equipmentStateMoves('character', item('rope', 'gear', EquipmentState.Dropped))).toEqual([
			{ action: 'pickUp', state: EquipmentState.Carried },
		]);
	});

	it('offers a vehicle to equip and unequip its vehicle weapons, but nothing to drop', () => {
		expect(actions('vehicle', item('turret', 'vehicleWeapon', EquipmentState.Carried))).toEqual(['equip']);
		expect(actions('vehicle', item('turret', 'vehicleWeapon', EquipmentState.Equipped))).toEqual(['unequip']);
		expect(actions('vehicle', item('rifle', 'weapon', EquipmentState.Carried))).toEqual([]);
	});

	it('offers an Adversary nothing: it has no Equipment State', () => {
		expect(actions('rival', item('sword', 'weapon', EquipmentState.Carried))).toEqual([]);
	});

	it('offers nothing for an item held in a Container, which shares its state', () => {
		expect(actions('character', item('knife', 'weapon', EquipmentState.Carried, 0, 'bag'))).toEqual([]);
	});
});

describe('rowEdge', () => {
	const row = { top: 100, height: 40 };

	it('is the edge before a row on its upper half, and after it on its lower half', () => {
		expect([100, 119].map((y) => rowEdge(y, row))).toEqual(['before', 'before']);
		expect([120, 139].map((y) => rowEdge(y, row))).toEqual(['after', 'after']);
	});
});

describe('rowDropTarget', () => {
	// A character with two Equipped weapons, and a Carried one to drop on their rows.
	const axe = item('axe', 'weapon', EquipmentState.Carried, 100000);
	const items = [
		item('sword', 'weapon', EquipmentState.Equipped, 100000),
		item('spear', 'weapon', EquipmentState.Equipped, 200000),
		axe,
		item('rope', 'gear', EquipmentState.Carried, 200000),
	];
	const pc = { uuid: 'Actor.pc', type: 'character', items };
	const from = { uuid: 'Actor.pc', isOwner: true, items };

	it("places an item dropped after a row right after the row's item, in its section", () => {
		const at = rowDropTarget(EquipmentState.Equipped, 0, 'after');

		expect(decideDrop(pc, { item: axe, from, at }, newIds())).toEqual({
			action: 'move',
			create: [],
			update: [
				{ _id: 'axe', sort: 200000, system: { state: EquipmentState.Equipped, container: '' } },
				{ _id: 'spear', sort: 300000 },
			],
			delete: [],
		});
	});

	it("places an item dropped before a row right before the row's item, the first row's at the top", () => {
		const at = rowDropTarget(EquipmentState.Equipped, 0, 'before');

		expect(decideDrop(pc, { item: axe, from, at }, newIds())).toEqual({
			action: 'move',
			create: [],
			update: [
				{ _id: 'axe', sort: 100000, system: { state: EquipmentState.Equipped, container: '' } },
				{ _id: 'sword', sort: 200000 },
				{ _id: 'spear', sort: 300000 },
			],
			delete: [],
		});
	});

	it("refuses an item the row's section refuses, as its sort slots do", () => {
		const rope = items[3];

		for (const edge of ['before', 'after'] as const) {
			const at = rowDropTarget(EquipmentState.Equipped, 1, edge);
			expect(decideDrop(pc, { item: rope, from, at }, newIds())).toEqual({ action: 'refuse' });
		}
	});
});

describe('equipmentStep', () => {
	const held = (quantity: number, damage: EquipmentDamageState) => ({ system: { quantity, damage } });

	it("raises and lowers an item's quantity by one", () => {
		expect(equipmentStep(held(2, EquipmentDamageState.Undamaged), 'quantity', 1)).toEqual({
			action: 'update',
			update: { system: { quantity: 3 } },
		});
		expect(equipmentStep(held(2, EquipmentDamageState.Undamaged), 'quantity', -1)).toEqual({
			action: 'update',
			update: { system: { quantity: 1 } },
		});
	});

	it('deletes an item whose quantity goes down to 0', () => {
		expect(equipmentStep(held(1, EquipmentDamageState.Undamaged), 'quantity', -1)).toEqual({ action: 'delete' });
	});

	it("steps an item's damage, and deletes it once destroyed past major damage", () => {
		expect(equipmentStep(held(1, EquipmentDamageState.Minor), 'damage', 1)).toEqual({
			action: 'update',
			update: { system: { damage: EquipmentDamageState.Moderate } },
		});
		expect(equipmentStep(held(1, EquipmentDamageState.Major), 'damage', 1)).toEqual({ action: 'delete' });
	});

	it('does nothing below undamaged', () => {
		expect(equipmentStep(held(1, EquipmentDamageState.Undamaged), 'damage', -1)).toEqual({ action: 'none' });
	});
});
