/**
 * @file A character's soak and defense, from their own values, their Brawn and their worn armor, and an adversary's and a vehicle's defense.
 */

import type { Defense } from '@/data/Actors';

/**
 * What this module needs of a piece of worn armor.
 */
type WornArmor = {
	soak: number;
	defense: number;
};

/**
 * The armor that protects a character: they benefit from one piece of armor even when they wear several (CRB p. 92).
 * Several are worn only in older data or after a macro, so the choice is made for them: the best soak, then the best
 * defense, then the first in item order.
 */
function protectingArmor(armor: WornArmor[]) {
	return armor.reduce<WornArmor | undefined>(
		(best, piece) => (!best || piece.soak > best.soak || (piece.soak === best.soak && piece.defense > best.defense) ? piece : best),
		undefined,
	);
}

/**
 * A character's soak: their Brawn, their own soak (from other sources), and the soak of their worn armor.
 */
export function totalSoak(ownSoak: number, brawn: number, armor: WornArmor[]) {
	return ownSoak + brawn + (protectingArmor(armor)?.soak ?? 0);
}

// No character, PC or Adversary, can have a defense rating higher than 4, and a vehicle's defense works the same (CRB p. 223).
const MAX_DEFENSE = 4;

/**
 * A character's melee and ranged defense: their own, increased by the defense of their worn armor, up to 4.
 */
export function totalDefense(defense: Defense, armor: WornArmor[]): Defense {
	const armorDefense = protectingArmor(armor)?.defense ?? 0;

	return {
		melee: Math.min(MAX_DEFENSE, defense.melee + armorDefense),
		ranged: Math.min(MAX_DEFENSE, defense.ranged + armorDefense),
	};
}

/**
 * An Adversary's melee and ranged defense: their stat block's, which already counts their armor, up to 4.
 */
export function adversaryDefense(defense: Defense): Defense {
	return totalDefense(defense, []);
}

/**
 * A vehicle's defense: its single rating counts against melee and ranged attacks alike, up to 4 as a character's
 * (CRB p. 223).
 */
export function vehicleDefense(defense: number): Defense {
	return totalDefense({ melee: defense, ranged: defense }, []);
}
