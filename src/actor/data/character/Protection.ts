/**
 * @file A character's soak and defense, from their own values, their Brawn and their equipped armor.
 */

import type { Defense } from '@/data/Actors';

/**
 * What this module needs of a piece of equipped armor.
 */
type EquippedArmor = {
	soak: number;
	defense: number;
};

/**
 * A character's soak: their Brawn, their own soak (from other sources), and the soak of their equipped armor.
 */
export function totalSoak(ownSoak: number, brawn: number, armor: EquippedArmor[]) {
	return ownSoak + brawn + armor.reduce((total, piece) => total + piece.soak, 0);
}

// No character can have a defense rating higher than 4.
const MAX_DEFENSE = 4;

/**
 * A character's melee and ranged defense: their own, increased by the defense of their equipped armor, up to 4.
 */
export function totalDefense(defense: Defense, armor: EquippedArmor[]): Defense {
	const armorDefense = armor.reduce((total, piece) => total + piece.defense, 0);

	return {
		melee: Math.min(MAX_DEFENSE, defense.melee + armorDefense),
		ranged: Math.min(MAX_DEFENSE, defense.ranged + armorDefense),
	};
}
