import { describe, expect, it } from 'vitest';
import { attachmentCopy, hardPointsTaken } from '@/item/data/Attachments';

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

describe('hardPointsTaken', () => {
	it('adds up the Hard Points of every attachment, the same one installed twice counting twice (CRB p. 206)', () => {
		expect(hardPointsTaken([attachment('a1', 1), attachment('a2', 1), attachment('a3', 2)])).toBe(4);
		expect(hardPointsTaken([])).toBe(0);
	});
});
