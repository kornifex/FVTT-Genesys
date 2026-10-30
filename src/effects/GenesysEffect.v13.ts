/**
 * @file Expired Effects on Foundry v13, which never expires an effect: the Acting GM marks them at each turn change.
 */

import type { GenesysCombat } from '@/combat/GenesysCombat';
import { effectsToExpire, type V13Duration } from '@/effects/EffectExpiry.v13';
import { FLAG_EXPIRED, type GenesysEffect } from '@/effects/GenesysEffect';

/**
 * Marks as expired the effects of a combat's combatants, their actors' and their items', whose duration in rounds or
 * turns has run out at the combat's current turn. Only a GM may write them all. v14's Active Effect registry expires
 * them itself.
 */
export async function expireEffectsOfCombat(combat: GenesysCombat) {
	// By uuid: two combatants may share a linked actor.
	const effects = new Map<string, GenesysEffect>();
	for (const combatant of combat.combatants) {
		// An unlinked token's combatant has the token's own actor, whose effects live in the token's delta.
		const actor = combatant.actor;
		if (!actor) {
			continue;
		}

		for (const effect of [...actor.effects, ...[...actor.items].flatMap((item) => [...item.effects])]) {
			effects.set(effect.uuid ?? effect.id, effect);
		}
	}

	const expiring = effectsToExpire(
		[...effects.values()].map((document) => ({
			document,
			expired: document.isExpired,
			duration: document._source.duration as V13Duration,
		})),
		combat.combatClock,
	);

	// One write per parent, an actor or an item, right after the read: an update in between could be overwritten.
	const byParent = new Map<Actor.Implementation | Item.Implementation, GenesysEffect[]>();
	for (const { document } of expiring) {
		const parent = document.parent;
		if (parent) {
			byParent.set(parent, [...(byParent.get(parent) ?? []), document]);
		}
	}
	for (const [parent, expired] of byParent) {
		await CONFIG.ActiveEffect.documentClass.updateDocuments(
			expired.map((effect) => ({ _id: effect.id, flags: { genesys: { [FLAG_EXPIRED]: true } } })),
			{ parent },
		);
	}
}
