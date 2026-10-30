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
 * The actor the Dice Roller opens the Dice Prompt for.
 */
export function diceRollerActor<A>(controlled: ControlledToken<A>[]): DiceRollerTarget<A> {
	if (controlled.length > 1) return { error: 'Genesys.Notifications.SelectNoneOrOneTokenForAction' };
	if (controlled[0]?.vehicle) return { error: 'Genesys.Notifications.InvalidTokenTypeForAction' };
	return { actor: controlled[0]?.actor };
}
