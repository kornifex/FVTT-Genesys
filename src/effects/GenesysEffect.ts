import { GenesysItem } from '@/item/GenesysItem';
import { isSuppressedAsConsumable, isSuppressedByContainer, isSuppressedByEquipmentState } from '@/actor/data/EquipmentEffects';
import { scaledChangeValue, sourceItem } from '@/effects/PoolModifications';
import type { EquipmentDataModel } from '@/item/data/EquipmentDataModel';
import { effectsToExpire, isExpired, rearms } from '@/effects/EffectExpiry';
import type { GenesysCombat } from '@/combat/GenesysCombat';

// v12 and v13: their effect duration has no `expired` field, so the Acting GM marks an Expired Effect with this flag.
const FLAG_EXPIRED = 'expired';

export class GenesysEffect extends ActiveEffect {
	/**
	 * An effect is suppressed when it's disabled, expired, or when the Equipment State of the item it comes from keeps it
	 * from applying.
	 */
	override get isSuppressed() {
		return this.disabled || this.isExpired || this.isSuppressedByEquipmentState;
	}

	/**
	 * Whether this effect is an Expired Effect: its duration in rounds or turns has run out.
	 */
	get isExpired() {
		return isExpired({ flag: this.getFlag('genesys', FLAG_EXPIRED) });
	}

	protected override async _preUpdate(
		changed: DeepPartial<this['_source']>,
		options: DocumentUpdateContext<this>,
		user: foundry.documents.BaseUser,
	) {
		// Foundry never sets an expired effect back: an update that gives its duration time left again rearms it.
		if (changed.duration) {
			const duration = this._source.duration;
			const newDuration = foundry.utils.mergeObject(duration, changed.duration, { inplace: false });
			const combat = game.combat;
			if (rearms({ expired: this.isExpired, duration }, newDuration, combat?.combatTime)) {
				foundry.utils.setProperty(changed, `flags.genesys.${FLAG_EXPIRED}`, false);
			}
		}

		return super._preUpdate(changed, options, user);
	}

	/**
	 * Whether the Equipment State of the item this effect comes from, the Container holding it, or its being a consumable
	 * keeps it from applying to the item's actor.
	 */
	get isSuppressedByEquipmentState() {
		const item = this.originItem;
		return !!item?.actor && isSuppressedByEquipmentState(item.actor.type, item);
	}

	/**
	 * Whether the item this effect comes from is a consumable, whose effects never apply to its actor.
	 */
	get isSuppressedAsConsumable() {
		const item = this.originItem;
		return !!item?.actor && isSuppressedAsConsumable(item.actor.type, item);
	}

	/**
	 * The Container holding the item this effect comes from, when it is what keeps the effect from applying.
	 */
	get suppressingContainer(): GenesysItem | undefined {
		const item = this.originItem;
		if (!item?.actor || !isSuppressedByContainer(item.actor.type, item)) {
			return undefined;
		}

		return item.actor.items.get((item.systemData as EquipmentDataModel).container) as GenesysItem | undefined;
	}

	get originItem(): GenesysItem | undefined {
		return sourceItem<GenesysItem>(this);
	}

	override apply(actor: Actor, change: ApplicableChangeData<this>): unknown {
		change.value = scaledChangeValue(this.originItem, change);

		return super.apply(actor, change);
	}
}

/**
 * Marks as expired the effects of a combat's combatants, their actors' and their items', whose duration in rounds or
 * turns has run out at the combat's current turn. Only a GM may write them all.
 */
export async function expireEffectsOfCombat(combat: GenesysCombat) {
	const effects = new Map<string, GenesysEffect>();
	for (const combatant of combat.combatants) {
		// An unlinked token's combatant has the token's own actor, whose effects live in the token's delta.
		const actor = combatant.actor;
		if (!actor) {
			continue;
		}

		// Two combatants may share a linked actor.
		for (const effect of [...actor.effects, ...[...actor.items].flatMap((item) => [...item.effects])] as GenesysEffect[]) {
			effects.set(effect.uuid, effect);
		}
	}

	const expiring = effectsToExpire(
		[...effects.values()].map((document) => ({ document, expired: document.isExpired, duration: document._source.duration })),
		combat.combatTime,
	);

	// Written by parent: an actor or an item.
	const byParent = new Map<Actor | Item, ({ _id: string } & Record<string, unknown>)[]>();
	for (const { document } of expiring) {
		const parent = document.parent;
		byParent.set(parent, [...(byParent.get(parent) ?? []), { _id: document.id, [`flags.genesys.${FLAG_EXPIRED}`]: true }]);
	}
	for (const [parent, updates] of byParent) {
		await parent.updateEmbeddedDocuments('ActiveEffect', updates);
	}
}
