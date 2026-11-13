import { describe, expect, it } from 'vitest';

import { effectTag, orphanedTaggedEffects, taggedEffectsData } from '@/item/data/EffectTags';

describe('effectTag', () => {
	it('reads the id an effect is tagged with by a flag, and none for an effect without the tag', () => {
		expect(effectTag({ flags: { genesys: { quality: 'accurate' } } }, 'quality')).toBe('accurate');
		expect(effectTag({ flags: { genesys: { quality: 'accurate' } } }, 'attachment')).toBeUndefined();
		expect(effectTag({ flags: { genesys: { quality: '' } } }, 'quality')).toBeUndefined();
		expect(effectTag({ flags: { genesys: {} } }, 'quality')).toBeUndefined();
		expect(effectTag({}, 'quality')).toBeUndefined();
	});
});

describe('taggedEffectsData', () => {
	it("tags each effect with the copy's id, without its own id, keeping its other flags and whether it is disabled", () => {
		const effects = [
			{ _id: 'e1', name: 'Base', disabled: false, flags: { core: { x: 1 } } },
			{ _id: 'e2', name: 'Modification', disabled: true, flags: null },
			{ _id: 'e3', name: 'Other', flags: { genesys: { lapses: true } } },
		];

		expect(taggedEffectsData(effects, 'attachment', 'a1')).toEqual([
			{ name: 'Base', disabled: false, flags: { core: { x: 1 }, genesys: { attachment: 'a1' } } },
			{ name: 'Modification', disabled: true, flags: { genesys: { attachment: 'a1' } } },
			{ name: 'Other', flags: { genesys: { lapses: true, attachment: 'a1' } } },
		]);
	});
});

describe('orphanedTaggedEffects', () => {
	it('lists the effects tagged by a flag with a copy the item no longer holds, and none of its other effects', () => {
		const effects = [
			{ id: 'kept', flags: { genesys: { attachment: 'a1' } } },
			{ id: 'gone', flags: { genesys: { attachment: 'a2' } } },
			{ id: 'again', flags: { genesys: { attachment: 'a2' } } },
			{ id: 'own', flags: {} },
			{ id: 'quality', flags: { genesys: { quality: 'q1' } } },
			{ id: null, flags: { genesys: { attachment: 'a3' } } },
		];

		expect(orphanedTaggedEffects(effects, 'attachment', ['a1'])).toEqual(['gone', 'again']);
		expect(orphanedTaggedEffects(effects, 'quality', [])).toEqual(['quality']);
	});
});
