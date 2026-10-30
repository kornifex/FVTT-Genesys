import { describe, expect, it } from 'vitest';
import { hasTimeLeft, isExpired } from '@/effects/EffectExpiry';

describe('isExpired', () => {
	it('reads an effect Foundry v14 marked as expired, in its duration, as expired', () => {
		expect(isExpired({ flag: undefined, durationExpired: true })).toBe(true);
	});

	it('reads an effect the Acting GM flagged as expired on Foundry v13 as expired, on v14 too', () => {
		expect(isExpired({ flag: true, durationExpired: undefined })).toBe(true);
		expect(isExpired({ flag: true, durationExpired: false })).toBe(true);
	});

	it('reads an effect neither marked nor flagged, or whose flag and mark are cleared, as not expired', () => {
		expect(isExpired({ flag: undefined, durationExpired: undefined })).toBe(false);
		expect(isExpired({ flag: false, durationExpired: false })).toBe(false);
	});
});

describe('hasTimeLeft', () => {
	it('gives time left to a duration with rounds or turns left', () => {
		expect(hasTimeLeft(1)).toBe(true);
		expect(hasTimeLeft(0.01)).toBe(true);
	});

	it('gives no time left to a duration that ran out, or ran out rounds ago as Foundry v14 counts it', () => {
		expect(hasTimeLeft(0)).toBe(false);
		expect(hasTimeLeft(-1)).toBe(false);
	});

	it('gives time left to a duration no combat counts, or that has no end', () => {
		expect(hasTimeLeft(undefined)).toBe(true);
		expect(hasTimeLeft(Infinity)).toBe(true);
	});
});
