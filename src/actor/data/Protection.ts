/**
 * @file A character's soak and defense, from their own values, their Brawn, their worn armor and the defense other sources provide, and an adversary's and a vehicle's defense.
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

function capped({ melee, ranged }: Defense): Defense {
	return { melee: Math.min(MAX_DEFENSE, melee), ranged: Math.min(MAX_DEFENSE, ranged) };
}

/**
 * A character's melee and ranged defense: the best of what their worn armor and other sources, as cover or Guarded
 * Stance, provide, which don't stack, increased by their own defense, up to 4 (CRB p. 106).
 */
export function totalDefense(own: Defense, armor: WornArmor[], provided: Defense): Defense {
	const armorDefense = protectingArmor(armor)?.defense ?? 0;

	return capped({
		melee: Math.max(armorDefense, provided.melee) + own.melee,
		ranged: Math.max(armorDefense, provided.ranged) + own.ranged,
	});
}

/**
 * An Adversary's melee and ranged defense: the best of their stat block's, which already counts their armor, and the
 * one other sources provide, up to 4 (CRB p. 106).
 */
export function adversaryDefense(statBlock: Defense, provided: Defense): Defense {
	return capped({
		melee: Math.max(statBlock.melee, provided.melee),
		ranged: Math.max(statBlock.ranged, provided.ranged),
	});
}

/**
 * A vehicle's defense: its single rating, raised by the Piloted Vehicle Defense of its Pilot (Defensive Driving, CRB
 * p. 80), counts against melee and ranged attacks alike, up to 4 as a character's (CRB p. 223).
 */
export function vehicleDefense(defense: number, pilotedVehicleDefense: number): Defense {
	const rating = defense + pilotedVehicleDefense;
	return capped({ melee: rating, ranged: rating });
}
