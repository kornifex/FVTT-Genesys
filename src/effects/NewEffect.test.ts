import { describe, expect, it } from 'vitest';

import { newEffectData } from '@/effects/NewEffect';

describe('newEffectData', () => {
	it('names a passive effect after its document, with the aura icon, enabled and without duration', () => {
		expect(newEffectData('Kira', 'passive')).toEqual({
			name: 'Kira',
			img: 'icons/svg/aura.svg',
			disabled: false,
			duration: undefined,
		});
	});

	it('gives a temporary effect a duration of one round', () => {
		expect(newEffectData('Kira', 'temporary')).toMatchObject({ disabled: false, duration: { rounds: 1 } });
	});

	it('creates a suppressed effect disabled and without duration', () => {
		expect(newEffectData('Kira', 'suppressed')).toMatchObject({ disabled: true, duration: undefined });
	});
});
