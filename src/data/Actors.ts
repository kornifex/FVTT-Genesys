/**
 * An actor's defense against melee and ranged attacks.
 */
export type Defense = {
	melee: number;
	ranged: number;
};

/**
 * A count with its threshold, such as wounds or strain.
 */
export type CombatPool = {
	value: number;
	max: number;
};
