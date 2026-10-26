/** @file The value a change on a token's bar or the Token HUD leaves on one of the system's token attributes. */

/**
 * A change on a token attribute: the amount to add when it is a delta, the value typed otherwise. An attribute that
 * stops at twice its threshold gives that threshold.
 */
type TokenAttributeChange = {
	current: number;
	value: number;
	isDelta: boolean;
	cappedThreshold?: number;
};

/**
 * The value a token attribute takes after a change. Wounds, strain, hull trauma and system strain count up from 0, and
 * healing or repairs stop there (CRB p. 113, 116-117, 222-223, 228). Past their threshold they keep counting, except a
 * character's wounds, which stop at twice their wound threshold (CRB p. 113).
 */
export function newTokenAttributeValue({ current, value, isDelta, cappedThreshold }: TokenAttributeChange) {
	const newValue = Math.max(isDelta ? current + value : value, 0);

	// A threshold the actor's data lacks gives no cap rather than a NaN value.
	return Number.isFinite(cappedThreshold) ? Math.min(newValue, 2 * cappedThreshold!) : newValue;
}
