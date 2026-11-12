import { describe, expect, it } from 'vitest';
import {
	ATTACHMENT_FLAG,
	attachmentCopy,
	attachmentEffectsData,
	attachmentIdOf,
	hardPointsTaken,
	orphanedAttachmentEffects,
} from '@/item/data/Attachments';

const attachment = (id: string, hardPointsRequired = 1) => ({ id, name: 'Scope', description: '', hardPointsRequired });

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

describe('attachmentEffectsData', () => {
	it("tags each effect with the attachment's id, without its own id, keeping its other flags and whether it is disabled", () => {
		const effects = [
			{ _id: 'e1', name: 'Base', disabled: false, flags: { core: { x: 1 } } },
			{ _id: 'e2', name: 'Modification', disabled: true, flags: null },
		];

		expect(attachmentEffectsData(effects, 'a1')).toEqual([
			{ name: 'Base', disabled: false, flags: { core: { x: 1 }, genesys: { [ATTACHMENT_FLAG]: 'a1' } } },
			{ name: 'Modification', disabled: true, flags: { genesys: { [ATTACHMENT_FLAG]: 'a1' } } },
		]);
	});
});

describe('orphanedAttachmentEffects', () => {
	it('lists the effects of the attachments the item no longer holds, and none of its other effects', () => {
		const effects = [
			{ id: 'kept', flags: { genesys: { attachment: 'a1' } } },
			{ id: 'gone', flags: { genesys: { attachment: 'a2' } } },
			{ id: 'own', flags: {} },
			{ id: 'quality', flags: { genesys: { quality: 'q1' } } },
		];

		expect(orphanedAttachmentEffects(effects, [attachment('a1')])).toEqual(['gone']);
		expect(attachmentIdOf(effects[2])).toBeUndefined();
	});
});

describe('hardPointsTaken', () => {
	it('adds up the Hard Points of every attachment, the same one installed twice counting twice (CRB p. 206)', () => {
		expect(hardPointsTaken([attachment('a1', 1), attachment('a2', 1), attachment('a3', 2)])).toBe(4);
		expect(hardPointsTaken([])).toBe(0);
	});
});
