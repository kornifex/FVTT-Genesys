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

export type CombatPool = {
	value: number;
	max: number;
};
