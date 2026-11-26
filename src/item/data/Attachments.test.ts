import { describe, expect, it } from 'vitest';
import type { AttachmentRating, ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';
import {
	attachmentCopy,
	attachmentQualitiesInstalled,
	attachmentQualitiesOfNewProfile,
	attachmentQualitiesTakenBack,
	hardPointsTaken,
} from '@/item/data/Attachments';

const attachment = (id: string, hardPointsRequired = 1) => ({ id, name: 'Scope', description: '', hardPointsRequired });

const quality = (
	id: string,
	name: string,
	rating = 1,
	attachmentRatings: AttachmentRating[] = [],
	isRated = true,
): ContainedItemQuality => ({
	id,
	name,
	description: `<p>${name}.</p>`,
	activation: 'passive',
	advantageCost: 2,
	isRated,
	rating,
	attachmentRatings,
	heldByItem: true,
});

// A quality the attachments brought, which the item doesn't hold itself.
const brought = (copy: ContainedItemQuality): ContainedItemQuality => ({ ...copy, heldByItem: false });

// Hands out the ids q1, q2… in turn, as `randomID` would hand out random ones.
const ids = () => {
	let next = 0;
	return () => `q${++next}`;
};

describe('attachmentQualitiesInstalled', () => {
	it("adds a quality the weapon lacks to every profile, each copy under a new id, at the attachment's rating, which it records", () => {
		const weapon = { qualities: [quality('w1', 'Pierce', 2)], extraProfiles: [{ name: 'Butt', qualities: [] }] };
		const balanced = { id: 'a1', qualities: [quality('x1', 'Accurate', 1)] };

		expect(attachmentQualitiesInstalled(weapon, balanced, ids())).toEqual({
			update: {
				qualities: [quality('w1', 'Pierce', 2), brought(quality('q1', 'Accurate', 1, [{ attachment: 'a1', rating: 1 }]))],
				extraProfiles: [{ name: 'Butt', qualities: [brought(quality('q2', 'Accurate', 1, [{ attachment: 'a1', rating: 1 }]))] }],
			},
			brought: [
				{ from: 'x1', to: 'q1' },
				{ from: 'x1', to: 'q2' },
			],
		});
	});

	it("raises a quality the profile holds, whatever the case of its name, by the attachment's rating, and brings nothing", () => {
		const armor = { qualities: [quality('w1', 'Pierce', 2)] };
		const edge = { id: 'a1', qualities: [quality('x1', 'pierce', 1)] };

		expect(attachmentQualitiesInstalled(armor, edge, ids())).toEqual({
			update: { qualities: [quality('w1', 'Pierce', 3, [{ attachment: 'a1', rating: 1 }])] },
			brought: [],
		});
	});

	it('counts an unrated quality once per holder: the weapon that holds Superior holds it twice with the attachment', () => {
		const weapon = { qualities: [quality('w1', 'Superior', 1, [], false)] };
		const customization = { id: 'a1', qualities: [quality('x1', 'Superior', 1, [], false)] };

		expect(attachmentQualitiesInstalled(weapon, customization, ids()).update).toEqual({
			qualities: [quality('w1', 'Superior', 2, [{ attachment: 'a1', rating: 1 }], false)],
		});
	});
});

describe('attachmentQualitiesTakenBack', () => {
	it('takes back what an attachment no longer held added on every profile: a raised rating comes down, a quality it brought goes', () => {
		const weapon = {
			qualities: [
				quality('w1', 'Pierce', 3, [{ attachment: 'a1', rating: 1 }]),
				brought(quality('w2', 'Accurate', 1, [{ attachment: 'a1', rating: 1 }])),
			],
			extraProfiles: [{ name: 'Butt', qualities: [brought(quality('w3', 'Accurate', 1, [{ attachment: 'a1', rating: 1 }]))] }],
		};

		expect(attachmentQualitiesTakenBack(weapon, [])).toEqual({
			qualities: [quality('w1', 'Pierce', 2)],
			extraProfiles: [{ name: 'Butt', qualities: [] }],
		});
	});

	it('takes back one of two copies of the same attachment, and keeps a quality another attachment still raises', () => {
		const weapon = {
			qualities: [
				quality('w1', 'Pierce', 2, [
					{ attachment: 'a1', rating: 1 },
					{ attachment: 'a2', rating: 1 },
				]),
				quality('w2', 'Superior', 2, [{ attachment: 'a1', rating: 1 }], false),
			],
		};

		expect(attachmentQualitiesTakenBack(weapon, ['a2'])).toEqual({
			qualities: [quality('w1', 'Pierce', 1, [{ attachment: 'a2', rating: 1 }]), quality('w2', 'Superior', 1, [], false)],
		});
	});

	it('changes nothing while every attachment that raised a quality is held', () => {
		const weapon = { qualities: [quality('w1', 'Pierce', 3, [{ attachment: 'a1', rating: 1 }]), quality('w2', 'Vicious', 1)] };

		expect(attachmentQualitiesTakenBack(weapon, ['a1'])).toBeUndefined();
	});

	it('keeps at rating 1 a quality an attachment still raises, after the table lowered it below what the attachments add', () => {
		const weapon = {
			qualities: [
				quality('w1', 'Pierce', 1, [
					{ attachment: 'a1', rating: 1 },
					{ attachment: 'a2', rating: 1 },
				]),
			],
		};

		expect(attachmentQualitiesTakenBack(weapon, ['a2'])).toEqual({
			qualities: [quality('w1', 'Pierce', 1, [{ attachment: 'a2', rating: 1 }])],
		});
	});

	it('keeps at rating 1, with its effects, a quality the item held, after the table lowered it to what the attachment adds', () => {
		const weapon = { qualities: [quality('w1', 'Pierce', 1, [{ attachment: 'a1', rating: 1 }])] };

		expect(attachmentQualitiesTakenBack(weapon, [])).toEqual({ qualities: [quality('w1', 'Pierce', 1)] });
	});

	it('takes back a quality the attachment brought after the table lowered it, and keeps what the table raised it by', () => {
		const weapon = {
			qualities: [
				brought(quality('w1', 'Pierce', 1, [{ attachment: 'a1', rating: 2 }])),
				brought(quality('w2', 'Vicious', 3, [{ attachment: 'a1', rating: 1 }])),
			],
		};

		expect(attachmentQualitiesTakenBack(weapon, [])).toEqual({ qualities: [brought(quality('w2', 'Vicious', 2))] });
	});
});

describe('attachmentQualitiesOfNewProfile', () => {
	it("copies each quality the attachments raise on the main profile, at what they add, under a new id the profile doesn't hold", () => {
		const main = [
			quality('w1', 'Pierce', 3, [
				{ attachment: 'a1', rating: 1 },
				{ attachment: 'a2', rating: 1 },
			]),
			brought(quality('w2', 'Superior', 1, [{ attachment: 'a1', rating: 1 }], false)),
			quality('w3', 'Vicious', 2),
		];

		expect(attachmentQualitiesOfNewProfile(main, ids())).toEqual({
			qualities: [
				brought(
					quality('q1', 'Pierce', 2, [
						{ attachment: 'a1', rating: 1 },
						{ attachment: 'a2', rating: 1 },
					]),
				),
				brought(quality('q2', 'Superior', 1, [{ attachment: 'a1', rating: 1 }], false)),
			],
			copied: [
				{ from: 'w1', to: 'q1' },
				{ from: 'w2', to: 'q2' },
			],
		});
	});
});

describe('attachmentCopy', () => {
	it('copies the name, description and Hard Points of the attachment item, under the id given', () => {
		expect(attachmentCopy('a1', { name: 'Scope', system: { description: '<p>Aim</p>', hardPointsRequired: 2 } })).toEqual({
			id: 'a1',
			name: 'Scope',
			description: '<p>Aim</p>',
			hardPointsRequired: 2,
		});
	});
});

describe('hardPointsTaken', () => {
	it('adds up the Hard Points of every attachment, the same one installed twice counting twice (CRB p. 206)', () => {
		expect(hardPointsTaken([attachment('a1', 1), attachment('a2', 1), attachment('a3', 2)])).toBe(4);
		expect(hardPointsTaken([])).toBe(0);
	});
});
