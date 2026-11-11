import { GenesysItem } from '@/item/GenesysItem';
import { isFoundryV13 } from '@/foundryGeneration';
import { isSuppressedAsConsumable, isSuppressedByContainer, isSuppressedByEquipmentState } from '@/actor/data/EquipmentEffects';
import { scaledChangeValue, sourceItem } from '@/effects/PoolModifications';
import type { EquipmentDataModel } from '@/item/data/EquipmentDataModel';
import { hasTimeLeft, isExpired } from '@/effects/EffectExpiry';
import { extendsExpiredEffect as extendsExpiredEffectOnV13, type V13Duration } from '@/effects/EffectExpiry.v13';
import { type CombatTurn, lapseAtTurnEnd } from '@/effects/LapsingEffects';

/**
 * The flag that marks an Expired Effect on Foundry v13, whose effect duration has no `expired` field: the Acting GM writes
 * it. It outlives v13 support: v14 still reads it and clears it when the duration is extended, so that an effect that
 * expired on v13 stays expired once the world runs v14.
 */
export const FLAG_EXPIRED = 'expired';

/**
 * The flag that makes an effect a Lapsing Effect: its duration in rounds counts its actor's turns, and it is removed
 * once they have run out, rather than expired. The Token States carry it.
 */
const FLAG_LAPSES = 'lapses';

/**
 * The flag that holds the turn a Lapsing Effect was applied during, in a combat, whose end doesn't count.
 */
const FLAG_APPLIED_DURING = 'appliedDuring';

// The rounds left of a Lapsing Effect, by plural category.
const ROUNDS_LEFT = { one: 'Genesys.TokenStates.RoundsLeft.one', other: 'Genesys.TokenStates.RoundsLeft.other' };

/**
 * A duration in rounds, as the version of Foundry stores it.
 */
export function durationInRounds(rounds: number) {
	// v13: a duration holds its rounds; from v14 on, a value and its units.
	return isFoundryV13() ? { rounds } : { value: rounds, units: 'rounds' as const };
}

/**
 * An Active Effect, which the Equipment State of its item suppresses, and whose changes the rank of its talent scales.
 */
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
		// v14 reads the stored `expired`: its prepared duration may be a copy counted as time-based, once the combat is
		// deleted in a world whose rounds last some seconds, which sets `expired` back to false.
		return isExpired({ flag: this.getFlag('genesys', FLAG_EXPIRED), durationExpired: this._source.duration.expired });
	}

	/**
	 * The rounds left of a Lapsing Effect, or undefined when the effect doesn't lapse: it lacks the flag, or its duration
	 * isn't in rounds.
	 */
	get lapsingRounds(): number | undefined {
		if (this.getFlag('genesys', FLAG_LAPSES) !== true) {
			return undefined;
		}

		// v13: a duration holds its rounds; from v14 on, a value and its units.
		const duration = this._source.duration as { rounds?: number | null; value?: number | null; units?: string };
		const rounds = isFoundryV13() ? duration.rounds : duration.units === 'rounds' ? duration.value : undefined;
		return typeof rounds === 'number' ? rounds : undefined;
	}

	/**
	 * Foundry v14's Active Effect registry expires the temporary effects it tracks: a Lapsing Effect counts its rounds
	 * itself, in its actor's turns, and is removed rather than expired. v13 has no registry.
	 */
	override get isExpiryTrackable() {
		return super.isExpiryTrackable && this.lapsingRounds === undefined;
	}

	/**
	 * The duration the Effects tab shows: the rounds left of a Lapsing Effect, which Foundry would count from the round it
	 * started, as it counts any other duration.
	 */
	get durationLabel(): string {
		const rounds = this.lapsingRounds;
		if (rounds === undefined) {
			return this.duration.label;
		}

		const key = game.i18n.pluralRules.select(rounds) === 'one' ? ROUNDS_LEFT.one : ROUNDS_LEFT.other;
		return game.i18n.format(key, { rounds: String(rounds) });
	}

	/**
	 * Records the turn a Lapsing Effect is applied during, whose end doesn't count.
	 */
	protected override async _preCreate(data: ActiveEffect.CreateData, options: ActiveEffect.Database.PreCreateOptions, user: User.Stored) {
		const combat = game.combat;
		if (this.getFlag('genesys', FLAG_LAPSES) === true && combat?.started) {
			const slot = combat.currentSlotId;
			if (slot) {
				this.updateSource({ flags: { genesys: { [FLAG_APPLIED_DURING]: { combat: combat.id!, round: combat.round, slot } } } });
			}
		}

		return super._preCreate(data, options, user);
	}

	protected override async _preUpdate(
		changed: ActiveEffect.UpdateData,
		options: ActiveEffect.Database.PreUpdateOptions,
		user: User.Stored,
	) {
		// Foundry never sets an expired effect back, but for a duration in seconds on v14: an update that extends its
		// duration, so that it has time left again, makes it apply again.
		if (this.isExpired && (changed.duration || changed.start)) {
			if (isFoundryV13()) {
				// v13: the duration holds its start, and Foundry counts it against the combat the user views.
				const duration = this._source.duration as V13Duration;
				const newDuration = foundry.utils.mergeObject(duration, (changed.duration ?? {}) as V13Duration, { inplace: false });
				const combat = game.combat;
				if (extendsExpiredEffectOnV13({ expired: true, duration }, newDuration, combat?.combatClock)) {
					foundry.utils.setProperty(changed, `flags.genesys.${FLAG_EXPIRED}`, false);
				}
			} else if (extendsExpiredEffectOnV14(this, changed)) {
				foundry.utils.setProperty(changed, 'duration.expired', false);
				// An effect that expired on v13 keeps its flag.
				if (this.getFlag('genesys', FLAG_EXPIRED)) {
					foundry.utils.setProperty(changed, `flags.genesys.${FLAG_EXPIRED}`, false);
				}
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

		return item.actor.items.get((item.system as EquipmentDataModel).container);
	}

	/**
	 * The item this effect comes from, if any.
	 */
	get originItem(): GenesysItem | undefined {
		return sourceItem<GenesysItem>(this);
	}

	/**
	 * Applies a change scaled by the rank of the talent its effect comes from. Foundry v14's `Actor#applyActiveEffects`
	 * and `TokenDocument#applyActiveEffects` call this method, with the effect in `change.effect`.
	 *
	 * The change is scaled on a copy: Foundry v14 keeps an actor's token changes in `actor.tokenActiveEffectChanges` and
	 * applies those same objects at every preparation of its tokens, so a change scaled in place would be scaled again
	 * each time.
	 */
	static override applyChange(
		targetDoc: ActiveEffect.ChangeTarget,
		change: ActiveEffect.ChangeData,
		options?: ActiveEffect.ApplyChangeOptions,
	) {
		const value = scaledChangeValue(change.effect?.originItem, { key: change.key ?? '', value: change.value });

		return super.applyChange(targetDoc, { ...change, value }, options);
	}

	// v13: `Actor#applyActiveEffects` calls the instance `apply`. On v14 it is a deprecated shim that calls the static
	// `applyChange`, which scales the change itself.
	override apply(actor: Actor.Implementation, change: ActiveEffect.ChangeData) {
		if (isFoundryV13()) {
			change.value = scaledChangeValue(this.originItem, { key: change.key ?? '', value: change.value });
		}

		return super.apply(actor, change);
	}
}

/**
 * Whether an update extends an Expired Effect on Foundry v14: it changes its duration or start, so that Foundry,
 * counting the updated effect as it counts every effect, finds time left in it.
 */
function extendsExpiredEffectOnV14(effect: GenesysEffect, changed: ActiveEffect.UpdateData) {
	const updated = effect.clone(foundry.utils.deepClone(changed), { keepId: true });
	const timing = ({ _source: { duration, start } }: GenesysEffect) => ({ duration: { ...duration, expired: false }, start });

	return !foundry.utils.objectsEqual(timing(effect), timing(updated)) && hasTimeLeft(updated.duration.remaining);
}

/**
 * Registers the effects of the combatants' actors with Foundry v14's Active Effect registry, which expires them, once the
 * world is ready.
 *
 * Foundry misses those of an unlinked token in combat when the world loads: preparing the combatant reads its actor
 * (`Combatant#updateResource`), which builds the token's actor before the registry is initialized, so that
 * `TokenDocument#_onDeltaMaterialized` skips it, and the registry's own initialization only reads the world's actors. A GM
 * who joins during a combat would never see those effects expire.
 */
export function registerCombatantEffects() {
	for (const combat of game.combats) {
		for (const combatant of combat.combatants) {
			const actor = combatant.actor;
			if (actor) {
				foundry.documents.ActiveEffect.registry.addFromParent(actor);
			}
		}
	}
}

/**
 * Takes a round off each Lapsing Effect of an actor, at the end of one of its turns, and removes those whose rounds have
 * run out. Only the actor's own effects lapse: the Token States live on it. Only a GM may write them.
 */
export async function lapseEffectsAtTurnEnd(actor: Actor.Implementation, ended: CombatTurn) {
	const shortened: { _id: string; duration: ReturnType<typeof durationInRounds> }[] = [];
	const removed: string[] = [];
	for (const effect of actor.effects as Iterable<GenesysEffect>) {
		const rounds = effect.lapsingRounds;
		if (rounds === undefined) {
			continue;
		}

		const lapse = lapseAtTurnEnd({ rounds, appliedDuring: effect.getFlag('genesys', FLAG_APPLIED_DURING) }, ended);
		if (lapse?.kind === 'shorten') {
			shortened.push({ _id: effect.id!, duration: durationInRounds(lapse.rounds) });
		} else if (lapse?.kind === 'remove') {
			removed.push(effect.id!);
		}
	}

	if (shortened.length > 0) {
		await actor.updateEmbeddedDocuments('ActiveEffect', shortened);
	}
	if (removed.length > 0) {
		await actor.deleteEmbeddedDocuments('ActiveEffect', removed);
	}
}
