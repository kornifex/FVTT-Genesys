import { describe, expect, it } from 'vitest';
import { showsMagicTab } from '@/actor/data/character/MagicTab';

const skill = (category: string, rank: number) => ({ type: 'skill', system: { category, rank } });
const spell = { type: 'spell', system: {} };

describe('showsMagicTab', () => {
	it('shows the tab of a character with a rank in a magic skill, who may cast spells with it (CRB p. 212)', () => {
		expect(showsMagicTab([skill('general', 2), skill('magic', 1)], false)).toBe(true);
	});

	it('shows the tab of a character who owns a spell, though they have no rank in a magic skill', () => {
		expect(showsMagicTab([skill('magic', 0), spell], false)).toBe(true);
	});

	it('hides the tab of a character without a rank in a magic skill nor a spell', () => {
		expect(showsMagicTab([skill('magic', 0), skill('knowledge', 3), { type: 'talent', system: {} }], false)).toBe(false);
	});

	it("hides the tab of a character who practices magic when the sheet's toggle hides it", () => {
		expect(showsMagicTab([skill('magic', 2), spell], true)).toBe(false);
	});
});
