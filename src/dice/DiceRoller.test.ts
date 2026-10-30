/**
 * @file Tests for what the Dice Roller opens the Dice Prompt for.
 */

import { describe, expect, it } from 'vitest';
import { diceRollerTarget } from '@/dice/DiceRoller';

describe('diceRollerTarget', () => {
	it('opens a bare Dice Prompt when no token is controlled', () => {
		expect(diceRollerTarget([])).toEqual({ actor: undefined });
	});

	it("opens the Dice Prompt for the single controlled token's actor", () => {
		expect(diceRollerTarget([{ actor: 'hero', vehicle: false }])).toEqual({ actor: 'hero' });
	});

	it('refuses to open when several tokens are controlled', () => {
		expect(
			diceRollerTarget([
				{ actor: 'hero', vehicle: false },
				{ actor: 'rival', vehicle: false },
			]),
		).toEqual({ error: 'Genesys.Notifications.SelectNoneOrOneTokenForAction' });
	});

	it('refuses to open for a controlled vehicle, which rolls no checks of its own', () => {
		expect(diceRollerTarget([{ actor: 'vehicle', vehicle: true }])).toEqual({
			error: 'Genesys.Notifications.InvalidTokenTypeForAction',
		});
	});

	it('opens a bare Dice Prompt when the controlled token has no actor', () => {
		expect(diceRollerTarget([{ vehicle: false }])).toEqual({ actor: undefined });
	});
});
