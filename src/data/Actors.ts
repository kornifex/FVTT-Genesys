/**
 * An actor's defense against melee and ranged attacks.
 */
export type Defense = {
	melee: number;
	ranged: number;
};

/**
 * The localization key of each defense's name.
 */
export const DEFENSE_LABELS: Record<keyof Defense, string> = {
	melee: 'Genesys.Labels.MeleeDefense',
	ranged: 'Genesys.Labels.RangedDefense',
};

/**
 * A count with its threshold, such as wounds or strain.
 */
export type CombatPool = {
	value: number;
	max: number;
};
