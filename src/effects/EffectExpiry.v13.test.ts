import { describe, expect, it } from 'vitest';
import { effectsToExpire, rearms } from '@/effects/EffectExpiry.v13';

describe('effectsToExpire', () => {
	const oneRound = { id: 'dazed', expired: false, duration: { rounds: 1, startRound: 1, startTurn: 0 } };

	it('expires a one-round effect at the start of the next round', () => {
		expect(effectsToExpire([oneRound], { round: 2, turn: 0, turnCount: 2 })).toEqual([oneRound]);
	});

	it('keeps a one-round effect running until its round is over', () => {
		expect(effectsToExpire([oneRound], { round: 1, turn: 1, turnCount: 2 })).toEqual([]);
	});

	it('expires a one-turn effect at the next turn, though it is an Extra Slot of the same combatant (#96)', () => {
		const oneTurn = { id: 'dazed', expired: false, duration: { turns: 1, startRound: 1, startTurn: 2 } };

		expect(effectsToExpire([oneTurn], { round: 1, turn: 2, turnCount: 4 })).toEqual([]);
		expect(effectsToExpire([oneTurn], { round: 1, turn: 3, turnCount: 4 })).toEqual([oneTurn]);
	});

	it('expires an effect once its rounds and turns have both run out', () => {
		const roundAndTurn = { id: 'dazed', expired: false, duration: { rounds: 1, turns: 1, startRound: 1, startTurn: 1 } };

		expect(effectsToExpire([roundAndTurn], { round: 2, turn: 1, turnCount: 3 })).toEqual([]);
		expect(effectsToExpire([roundAndTurn], { round: 2, turn: 2, turnCount: 3 })).toEqual([roundAndTurn]);
	});

	it('leaves an expired effect alone, so that it is written once', () => {
		expect(effectsToExpire([{ ...oneRound, expired: true }], { round: 3, turn: 0, turnCount: 2 })).toEqual([]);
	});

	it('never expires an effect without a duration in rounds or turns', () => {
		const effects = [
			{ id: 'passive', expired: false, duration: { rounds: null, turns: null, startRound: 1, startTurn: 0 } },
			{ id: 'zero', expired: false, duration: { rounds: 0, turns: 0, startRound: 1, startTurn: 0 } },
		];

		expect(effectsToExpire(effects, { round: 5, turn: 0, turnCount: 2 })).toEqual([]);
	});

	it('leaves a duration in seconds to Foundry, which counts it first whatever its rounds and turns', () => {
		const seconds = { id: 'seconds', expired: false, duration: { seconds: 6, rounds: 1, startRound: 1, startTurn: 0 } };

		expect(effectsToExpire([seconds], { round: 5, turn: 0, turnCount: 2 })).toEqual([]);
	});

	it('counts an effect created out of combat, without a start, from round 0, as Foundry does', () => {
		const noStart = { id: 'blessed', expired: false, duration: { rounds: 2, startRound: null, startTurn: null } };

		expect(effectsToExpire([noStart], { round: 1, turn: 0, turnCount: 2 })).toEqual([]);
		expect(effectsToExpire([noStart], { round: 2, turn: 0, turnCount: 2 })).toEqual([noStart]);
	});
});

describe('rearms', () => {
	const expiredOneRound = { expired: true, duration: { rounds: 1, startRound: 1, startTurn: 0 } };
	const roundTwo = { round: 2, turn: 0, turnCount: 2 };

	it('rearms an expired effect whose duration is extended so that it has time left', () => {
		expect(rearms(expiredOneRound, { ...expiredOneRound.duration, rounds: 2 }, roundTwo)).toBe(true);
	});

	it('rearms an expired effect whose duration starts again from the current round', () => {
		expect(rearms(expiredOneRound, { ...expiredOneRound.duration, startRound: 2 }, roundTwo)).toBe(true);
	});

	it('keeps an effect expired when its new duration has run out too', () => {
		expect(rearms(expiredOneRound, { ...expiredOneRound.duration, rounds: 2 }, { round: 3, turn: 0, turnCount: 2 })).toBe(false);
	});

	it('keeps an effect expired when an update leaves its duration as it is, as turning it on by hand does', () => {
		expect(rearms(expiredOneRound, { ...expiredOneRound.duration }, roundTwo)).toBe(false);
	});

	it('rearms an expired effect whose duration is changed out of combat, where no time is counted', () => {
		expect(rearms(expiredOneRound, { ...expiredOneRound.duration, rounds: 3 }, undefined)).toBe(true);
	});

	it('rearms an expired effect whose duration is removed, since it is no longer temporary', () => {
		expect(rearms(expiredOneRound, { ...expiredOneRound.duration, rounds: null }, roundTwo)).toBe(true);
	});

	it('has nothing to rearm in an effect that is not expired', () => {
		expect(rearms({ ...expiredOneRound, expired: false }, { ...expiredOneRound.duration, rounds: 2 }, roundTwo)).toBe(false);
	});
});
