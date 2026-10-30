/**
 * @file Expired Effects: a temporary effect whose duration in rounds or turns has run out stops applying, but isn't deleted.
 */

/**
 * What an effect stores of its expiry.
 */
type StoredExpiry = {
	/** The `flags.genesys.expired` flag, which the Acting GM writes on Foundry v13. */
	flag: unknown;
	/** Foundry v14's `duration.expired`, which its Active Effect registry writes; v13's duration has no such field. */
	durationExpired: boolean | undefined;
};

/**
 * Whether an effect is an Expired Effect. The flag counts on v14 too, so that an effect that expired on v13 stays expired
 * once the world runs v14.
 */
export function isExpired({ flag, durationExpired }: StoredExpiry) {
	return flag === true || durationExpired === true;
}

/**
 * Whether a duration has time left, from Foundry's remaining duration: undefined when no combat counts it (v13), infinite
 * when it has no end, and negative once it ran out rounds ago (v14).
 */
export function hasTimeLeft(remaining: number | undefined) {
	return remaining === undefined || remaining > 0;
}
