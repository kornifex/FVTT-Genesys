import { afterEach, describe, expect, it, vi } from 'vitest';

import { Characteristic } from '@/data/Characteristics';
import { chatCard, enrichedQualities, ItemCard } from '@/item/ChatCards';

const i18n = {
	localize: (key: string) => key.split('.').pop()!,
	format: (key: string, data: Record<string, string>) => `${key.split('.').pop()!}(${Object.values(data).join(', ')})`,
};

describe('chatCard', () => {
	it("gives an ability's card its activation, without tier or rank", () => {
		const card = chatCard(
			{
				type: 'ability',
				img: 'ability.webp',
				name: 'Nimble',
				system: { description: '<p>Moves fast.</p>', activation: { type: 'active', detail: 'Maneuver' } },
			},
			i18n,
		);

		expect(card).toEqual({
			template: 'systems/genesys/templates/chat/ability.hbs',
			data: {
				img: 'ability.webp',
				name: 'Nimble',
				description: '<p>Moves fast.</p>',
				activation: { label: 'Genesys.Labels.Active', detail: 'Maneuver' },
			},
		});
	});

	const talent = (ranked: 'yes' | 'no') =>
		chatCard(
			{
				type: 'talent',
				img: 'talent.webp',
				name: 'Grit',
				system: {
					description: '<p>Tough.</p>',
					activation: { type: 'passive', detail: '' },
					effectiveTier: 2,
					ranked,
					rank: 2,
				},
			},
			i18n,
		);

	it("gives a ranked talent's card its effective tier and rank", () => {
		expect(talent('yes').data).toEqual({
			img: 'talent.webp',
			name: 'Grit',
			description: '<p>Tough.</p>',
			activation: { label: 'Genesys.Labels.Passive', detail: '' },
			effectiveTier: 2,
			ranked: true,
			rank: 2,
		});
	});

	it('marks a non-ranked talent as not ranked', () => {
		expect(talent('no')).toMatchObject({
			template: 'systems/genesys/templates/chat/ability.hbs',
			data: { effectiveTier: 2, ranked: false },
		});
	});

	const sharp = () => ({ name: 'Pierce', description: '<p>@UUID[Item.abc]{Pierce}</p>', isRated: true, rating: 2 });

	it("gives an armor's card its defense, soak and qualities", () => {
		const system = { description: '<p>Heavy.</p>', defense: 1, soak: 2, qualities: [sharp()] };
		const card = chatCard({ type: 'armor', img: 'armor.webp', name: 'Plate', system }, i18n);

		expect(card).toEqual({
			template: 'systems/genesys/templates/chat/item.hbs',
			data: {
				img: 'armor.webp',
				name: 'Plate',
				type: 'armor',
				system,
				description: '<p>Heavy.</p>',
				qualities: [sharp()],
			},
		});
	});

	it("copies the item's qualities, so enriching the card's leaves the item's as they are saved", () => {
		const system = { description: '', defense: 0, soak: 1, qualities: [sharp()] };
		const card = chatCard({ type: 'armor', img: null, name: 'Padded', system }, i18n) as ItemCard;

		card.data.qualities![0].description = '<p><a class="content-link">Pierce</a></p>';

		expect(system.qualities).toEqual([sharp()]);
	});

	const weapon = (damageCharacteristic: Characteristic | '-') => ({
		description: '',
		skills: ['Melee', 'Brawl'],
		range: 'engaged' as const,
		baseDamage: 3,
		damageCharacteristic,
		critical: 4,
		qualities: [sharp()],
		attackSkill: '',
		extraProfiles: [],
	});

	it("gives a weapon's card its first skill, its range and its damage, with its damage characteristic", () => {
		const system = weapon(Characteristic.Brawn);
		const card = chatCard({ type: 'weapon', img: 'sword.webp', name: 'Sword', system }, i18n);

		expect(card).toEqual({
			template: 'systems/genesys/templates/chat/item.hbs',
			data: {
				img: 'sword.webp',
				name: 'Sword',
				type: 'weapon',
				system,
				description: '',
				weapon: { skill: 'Melee', range: 'Engaged', damage: '3 + Brawn' },
				qualities: [sharp()],
			},
		});
	});

	it('gives a weapon without a damage characteristic, or without skills, its base damage and no skill', () => {
		const card = chatCard({ type: 'weapon', img: null, name: 'Rock', system: { ...weapon('-'), skills: [] } }, i18n);

		expect(card.data).toMatchObject({ weapon: { skill: '-', damage: '3' } });
	});

	it('gives a weapon whose damage was emptied a damage of 0', () => {
		const card = chatCard(
			{ type: 'weapon', img: null, name: 'Stick', system: { ...weapon('-'), baseDamage: null as unknown as number } },
			i18n,
		);

		expect(card.data).toMatchObject({ weapon: { damage: '0' } });
	});

	it('lists each extra profile of a weapon after its main profile, named as its row, with its own skill, range, damage, critical and qualities', () => {
		const accurate = { name: 'Accurate', description: '<p>Aims true.</p>', isRated: true, rating: 1 };
		const thrown = {
			name: 'Thrown',
			skills: ['Ranged'],
			damageCharacteristic: Characteristic.Brawn,
			baseDamage: 2,
			critical: 4,
			range: 'short' as const,
			qualities: [accurate],
			attackSkill: '',
		};
		const system = { ...weapon(Characteristic.Brawn), extraProfiles: [thrown, { ...thrown, name: '', skills: [], qualities: [] }] };
		const card = chatCard({ type: 'weapon', img: null, name: 'Dagger', system }, i18n) as ItemCard;

		expect(card.data).toMatchObject({
			weapon: { skill: 'Melee', range: 'Engaged', damage: '3 + Brawn' },
			qualities: [sharp()],
			extraProfiles: [
				{
					name: 'RowName(Dagger, Thrown)',
					weapon: { skill: 'Ranged', range: 'Short', damage: '2 + Brawn' },
					critical: 4,
					qualities: [accurate],
				},
				{
					name: 'RowName(Dagger, Numbered(3))',
					weapon: { skill: '-', range: 'Short', damage: '2 + Brawn' },
					critical: 4,
					qualities: [],
				},
			],
		});
	});

	it("copies an extra profile's qualities, so enriching the card's leaves the item's as they are saved", () => {
		const thrown = { ...weapon('-'), name: 'Thrown', attackSkill: '' };
		const system = { ...weapon('-'), extraProfiles: [thrown] };
		const card = chatCard({ type: 'weapon', img: null, name: 'Dagger', system }, i18n) as ItemCard;

		card.data.extraProfiles![0].qualities[0].description = '<p><a class="content-link">Pierce</a></p>';

		expect(thrown.qualities).toEqual([sharp()]);
	});

	const vehicleWeapon = (firingArc: { fore: boolean; aft: boolean; port: boolean; starboard: boolean }) =>
		chatCard(
			{
				type: 'vehicleWeapon',
				img: 'cannon.webp',
				name: 'Cannon',
				system: { description: '', skills: ['Gunnery'], range: 'long', baseDamage: 6, critical: 3, firingArc, qualities: [] },
			},
			i18n,
		);

	it.each([
		[{ fore: true, aft: true, port: true, starboard: true }, 'All'],
		[{ fore: false, aft: false, port: false, starboard: false }, 'None'],
		[{ fore: true, aft: false, port: true, starboard: false }, 'Fore, Port'],
	])("gives a vehicle weapon's card its skill, range, damage and firing arc %j", (firingArc, label) => {
		expect(vehicleWeapon(firingArc).data).toMatchObject({
			type: 'vehicleWeapon',
			weapon: { skill: 'Gunnery', range: 'Long', damage: '6', firingArc: label },
			qualities: [],
		});
	});

	it("gives gear's card its description, without weapon or qualities", () => {
		const card = chatCard({ type: 'gear', img: 'rope.webp', name: 'Rope', system: { description: '<p>Long.</p>' } }, i18n);

		expect(card.data).toEqual({
			img: 'rope.webp',
			name: 'Rope',
			type: 'gear',
			system: { description: '<p>Long.</p>' },
			description: '<p>Long.</p>',
		});
	});
});

describe('enrichedQualities', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('enriches copies of the qualities, leaving the qualities as they are saved', async () => {
		vi.stubGlobal('foundry', {
			applications: {
				ux: {
					TextEditor: {
						implementation: {
							enrichHTML: (html: string) => Promise.resolve(html.replace('@UUID[Item.abc]{Pierce}', '<a>Pierce</a>')),
						},
					},
				},
			},
		});
		const qualities = [{ name: 'Pierce', description: '<p>@UUID[Item.abc]{Pierce}</p>', isRated: true, rating: 2 }];

		expect(await enrichedQualities(qualities)).toEqual([
			{ name: 'Pierce', description: '<p><a>Pierce</a></p>', isRated: true, rating: 2 },
		]);
		expect(qualities).toEqual([{ name: 'Pierce', description: '<p>@UUID[Item.abc]{Pierce}</p>', isRated: true, rating: 2 }]);
	});
});
