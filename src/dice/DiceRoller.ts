/**
 * @file The Dice Roller: the Dice Prompt that the `/gendr` chat command and the chat's dice button open.
 */

/**
 * A token the user controls.
 */
export type ControlledToken<A> = {
	actor?: A;
	vehicle: boolean;
};

/**
 * The actor the Dice Roller opens the Dice Prompt for, none for a bare prompt, or the error it shows instead.
 */
export type DiceRollerTarget<A> =
	| { actor?: A }
	| { error: 'Genesys.Notifications.SelectNoneOrOneTokenForAction' | 'Genesys.Notifications.InvalidTokenTypeForAction' };

/**
 * What the Dice Roller opens the Dice Prompt for: the actor of the single controlled token, a bare prompt when no token
 * is controlled, or an error for several tokens or a vehicle.
 */
export function diceRollerTarget<A>(controlled: ControlledToken<A>[]): DiceRollerTarget<A> {
	if (controlled.length > 1) return { error: 'Genesys.Notifications.SelectNoneOrOneTokenForAction' };
	if (controlled[0]?.vehicle) return { error: 'Genesys.Notifications.InvalidTokenTypeForAction' };
	return { actor: controlled[0]?.actor };
}
