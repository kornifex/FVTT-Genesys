/** @file Tests for the faces of each die type, against the Core Rulebook. */

import { describe, expect, it, vi } from 'vitest';

// The dice types extend `foundry.dice.terms.Die` and the Dice So Nice! registration listens to `Hooks`; both are Foundry globals.
vi.hoisted(() => {
	Object.assign(globalThis, {
		foundry: { dice: { terms: { Die: class {} } } },
		Hooks: { once: () => {}, on: () => {} },
	});
});

import { GenesysDice } from '@/dice';
import { DieFaces } from '@/dice/DieFaces';

describe('the dice', () => {
	it('are Boost, Ability and Proficiency on the positive side, Setback, Difficulty and Challenge on the negative (CRB p. 9-10)', () => {
		expect(GenesysDice.Boost.CATEGORY).toBe('positive');
		expect(GenesysDice.Ability.CATEGORY).toBe('positive');
		expect(GenesysDice.Proficiency.CATEGORY).toBe('positive');
		expect(GenesysDice.Setback.CATEGORY).toBe('negative');
		expect(GenesysDice.Difficulty.CATEGORY).toBe('negative');
		expect(GenesysDice.Challenge.CATEGORY).toBe('negative');
	});

	// Table I.1–2, face by face: s Success, a Advantage, t Triumph, f Failure, h Threat, d Despair. The Triumph is the
	// Proficiency die's highest face, the one Foundry's explode modifier rolls again on for a super-characteristic (CRB p. 251).
	it.each([
		['Boost', 'd6', [' ', ' ', 's', 'sa', 'aa', 'a']],
		['Setback', 'd6', [' ', ' ', 'f', 'f', 'h', 'h']],
		['Ability', 'd8', [' ', 's', 's', 'ss', 'a', 'a', 'sa', 'aa']],
		['Difficulty', 'd8', [' ', 'f', 'ff', 'h', 'h', 'h', 'hh', 'fh']],
		['Proficiency', 'd12', [' ', 's', 's', 'ss', 'ss', 'a', 'sa', 'sa', 'sa', 'aa', 'aa', 't']],
		['Challenge', 'd12', [' ', 'f', 'f', 'ff', 'ff', 'h', 'h', 'fh', 'fh', 'hh', 'hh', 'd']],
	] as const)('gives the %s die (a %s) the faces of Table I.1–2 (CRB p. 10)', (die, _, faces) => {
		expect(DieFaces[die]).toEqual(faces);
	});

	it('puts Triumph on the Proficiency die only, and Despair on the Challenge die only (CRB p. 12-13)', () => {
		const diceWith = (glyph: string) =>
			Object.entries(DieFaces).flatMap(([die, faces]) => (faces.join('').includes(glyph) ? [die] : []));

		expect(diceWith('t')).toEqual(['Proficiency']);
		expect(diceWith('d')).toEqual(['Challenge']);
	});

	it('puts Success and Advantage on the positive dice only, Failure and Threat on the negative dice only (CRB p. 11-12)', () => {
		for (const [die, faces] of Object.entries(DieFaces)) {
			const glyphs = faces.join('');
			const positive = GenesysDice[die as keyof typeof DieFaces].CATEGORY === 'positive';

			expect(/[sat]/.test(glyphs)).toBe(positive);
			expect(/[fhd]/.test(glyphs)).toBe(!positive);
		}
	});
});
