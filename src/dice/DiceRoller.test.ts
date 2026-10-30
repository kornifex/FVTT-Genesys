/**
 * @file Tests for which actor the Dice Roller opens the Dice Prompt for.
 */

import { describe, expect, it } from 'vitest';
import { diceRollerActor } from '@/dice/DiceRoller';

describe('diceRollerActor', () => {
	it('opens a bare Dice Prompt when no token is controlled', () => {
		expect(diceRollerActor([])).toEqual({ actor: undefined });
	});

	it("opens the Dice Prompt for the single controlled token's actor", () => {
		expect(diceRollerActor([{ actor: 'hero', vehicle: false }])).toEqual({ actor: 'hero' });
	});

	it('refuses to open when several tokens are controlled', () => {
		expect(
			diceRollerActor([
				{ actor: 'hero', vehicle: false },
				{ actor: 'rival', vehicle: false },
			]),
		).toEqual({ error: 'Genesys.Notifications.SelectNoneOrOneTokenForAction' });
	});

	it('refuses to open for a controlled vehicle, which rolls no checks of its own', () => {
		expect(diceRollerActor([{ actor: 'vehicle', vehicle: true }])).toEqual({
			error: 'Genesys.Notifications.InvalidTokenTypeForAction',
		});
	});

	it('opens a bare Dice Prompt when the controlled token has no actor', () => {
		expect(diceRollerActor([{ vehicle: false }])).toEqual({ actor: undefined });
	});
});
