import { GenesysItem } from '@/item/GenesysItem';
import { isSuppressedAsConsumable, isSuppressedByContainer, isSuppressedByEquipmentState } from '@/actor/data/EquipmentEffects';
import { scaledChangeValue, sourceItem } from '@/effects/PoolModifications';
import type { EquipmentDataModel } from '@/item/data/EquipmentDataModel';
import { type CombatTurn, lapseAtTurnEnd, parseCombatTurn } from '@/effects/LapsingEffects';
import type { StateChange } from '@/effects/TokenStates';
import { effectQuality, isOutrankedQualityEffect } from '@/item/data/Qualities';
import type { ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';
import { isItemChangeKey } from '@/item/ItemChanges';
import * as log from '@/log';

/**
 * The flag that makes an effect a Lapsing Effect: its duration in rounds counts its actor's turns, and it is removed
 * once they have run out, rather than expired. The Token States carry it.
 */
const FLAG_LAPSES = 'lapses';

/**
 * The flag that holds the turn a Lapsing Effect was applied during, in a combat, whose end doesn't count.
 */
const FLAG_APPLIED_DURING = 'appliedDuring';

/**
 * The flag that holds the last turn whose end took a round off a Lapsing Effect.
 */
const FLAG_LAST_COUNTED = 'lastCounted';

// The rounds left of a Lapsing Effect, by plural category.
const ROUNDS_LEFT = { one: 'Genesys.TokenStates.RoundsLeft.one', other: 'Genesys.TokenStates.RoundsLeft.other' };

/**
 * Where an effect keeps its changes, in its data and in the effect sheet's form.
 */
export function changesPath() {
	return 'system.changes';
}

// The item types whose effects a weapon or an armor copies, and which change nothing until then.
const UNINSTALLED_TYPES: readonly string[] = ['quality', 'attachment'];

/**
 * A change of a Token State or a maneuver, as Foundry stores it.
 */
export function foundryChange({ key, value, type }: StateChange) {
	return { key, value, type };
}

/**
 * A duration in rounds, as Foundry stores it.
 */
export function durationInRounds(rounds: number) {
	return { value: rounds, units: 'rounds' as const };
}

/**
 * The data that makes an effect a Lapsing Effect lasting a number of rounds: its duration and its flag. Any effect
 * created with it lapses, as the Token States do.
 */
export function lapsingFor(rounds: number) {
	return { duration: durationInRounds(rounds), flags: { genesys: { [FLAG_LAPSES]: true } } };
}

/**
 * An Active Effect, which the Equipment State of its item suppresses, and whose changes the rank of its talent, or of
 * its weapon's or armor's quality, scales.
 */
export class GenesysEffect extends ActiveEffect {
	/**
	 * An effect is suppressed when it's disabled, expired, or when the Equipment State of the item it comes from keeps it
	 * from applying.
	 */
	override get isSuppressed() {
		return this.disabled || this.isExpired || this.isSuppressedByEquipmentState || this.isUninstalled;
	}

	/**
	 * Whether this effect belongs to a quality or an attachment item that an actor holds as is: its effects apply once
	 * it is copied on a weapon or an armor, never from the actor's items.
	 */
	get isUninstalled() {
		const item = this.originItem;
		return !!item?.actor && UNINSTALLED_TYPES.includes(item.type);
	}

	/**
	 * An effect applies its changes to its actor unless it is suppressed, or belongs to a weapon's quality that another of
	 * the weapon's profiles holds at a higher rank: such a quality counts once per weapon. Its Pool Modifications still
	 * change the attacks made with its profile, which read the weapon's effects rather than whether they are active.
	 */
	override get active() {
		return super.active && !isOutrankedQualityEffect(this, this.originItem?.system);
	}

	/**
	 * Whether this effect is an Expired Effect: its duration in rounds or turns has run out.
	 */
	get isExpired() {
		// The stored `expired`, which Foundry's Active Effect registry writes: the prepared duration may be a copy counted as
		// time-based, once the combat is deleted in a world whose rounds last some seconds, which sets `expired` back to false.
		return this._source.duration.expired === true;
	}

	/**
	 * The rounds left of a Lapsing Effect, or undefined when the effect doesn't lapse: it lacks the flag, or its duration
	 * isn't in rounds.
	 */
	get lapsingRounds(): number | undefined {
		if (this.getFlag('genesys', FLAG_LAPSES) !== true) {
			return undefined;
		}

		const { value, units } = this._source.duration;
		return units === 'rounds' && typeof value === 'number' ? value : undefined;
	}

	/**
	 * Foundry's Active Effect registry expires the temporary effects it tracks: a Lapsing Effect counts its rounds itself,
	 * in its actor's turns, and is removed rather than expired.
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
	 * Records the turn a Lapsing Effect is applied during, in its actor's combat, whose end doesn't count.
	 */
	protected override async _preCreate(data: ActiveEffect.CreateData, options: ActiveEffect.Database.PreCreateOptions, user: User.Stored) {
		// A state lives on its actor, in the world or the synthetic actor of a token in a scene, never on an item.
		const actor = this.parent?.documentName === 'Actor' ? (this.parent as Actor.Stored) : undefined;
		if (this.getFlag('genesys', FLAG_LAPSES) === true && actor) {
			// The combat the user views first: the actor may be in another, which the user doesn't view.
			const combat = [game.combat, ...game.combats].find(
				(candidate) => candidate?.started && candidate.getCombatantsByActor(actor).length > 0,
			);
			const slot = combat?.currentSlotId;
			if (combat && slot) {
				this.updateSource({
					flags: {
						genesys: { [FLAG_APPLIED_DURING]: { combat: combat.id!, round: combat.round, turn: combat.turn ?? 0, slot } },
					},
				});
			}
		}

		return super._preCreate(data, options, user);
	}

	protected override async _preUpdate(
		changed: ActiveEffect.UpdateData,
		options: ActiveEffect.Database.PreUpdateOptions,
		user: User.Stored,
	) {
		// Foundry never sets an expired effect back, but for a duration in seconds: an update that extends its duration, so
		// that it has time left again, makes it apply again.
		if (this.isExpired && (changed.duration || changed.start) && extendsExpiredEffect(this, changed)) {
			foundry.utils.setProperty(changed, 'duration.expired', false);
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
	 * The quality of a weapon or an armor this effect belongs to, if any, whose rating scales its changes.
	 */
	get quality(): ContainedItemQuality | undefined {
		return effectQuality(this, this.originItem?.system);
	}

	/**
	 * Applies a change scaled by the rank of the talent its effect comes from. Foundry's `Actor#applyActiveEffects` and
	 * `TokenDocument#applyActiveEffects` call this method, with the effect in `change.effect`.
	 *
	 * The change is scaled on a copy: Foundry keeps an actor's token changes in `actor.tokenActiveEffectChanges` and
	 * applies those same objects at every preparation of its tokens, so a change scaled in place would be scaled again
	 * each time.
	 */
	static override applyChange(
		targetDoc: ActiveEffect.ChangeTarget,
		change: ActiveEffect.ChangeData,
		options?: ActiveEffect.ApplyChangeOptions,
	) {
		// An Item Change changes the effect's item, which prepares it itself (`GenesysItem#prepareDerivedData`).
		if (isItemChangeKey(change.key)) {
			return {};
		}

		const effect = change.effect;
		const value = scaledChangeValue(effect?.originItem, { key: change.key ?? '', value: change.value }, effect?.quality);

		return super.applyChange(targetDoc, { ...change, value }, options);
	}
}

/**
 * Whether an update extends an Expired Effect: it changes its duration or start, so that Foundry, counting the updated
 * effect as it counts every effect, finds time left in it. Foundry's remaining duration is infinite when no combat
 * counts it or it has no end, and negative once it ran out rounds ago.
 */
function extendsExpiredEffect(effect: GenesysEffect, changed: ActiveEffect.UpdateData) {
	const updated = effect.clone(foundry.utils.deepClone(changed), { keepId: true });
	const timing = ({ _source: { duration, start } }: GenesysEffect) => ({ duration: { ...duration, expired: false }, start });

	return !foundry.utils.equals(timing(effect), timing(updated)) && updated.duration.remaining > 0;
}

/**
 * Registers the effects of the combatants' actors with Foundry's Active Effect registry, which expires them, once the
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
 * The turn an effect's flag holds, parsed where it is read; undefined when it holds none. A malformed one is logged and
 * read as none, rather than thrown at every turn end of the combat.
 */
function turnFlag(effect: GenesysEffect, key: typeof FLAG_APPLIED_DURING | typeof FLAG_LAST_COUNTED) {
	const flag = effect.getFlag('genesys', key);
	const turn = parseCombatTurn(flag);
	if (flag != null && !turn) {
		log.warn(`The ${key} flag of effect ${effect.uuid} is malformed, and read as none.`, flag);
	}
	return turn;
}

/**
 * Takes a round off each Lapsing Effect of an actor, at the end of one of its turns, and removes those whose rounds have
 * run out, given the places of the round's turns the actor takes. Only the actor's own effects lapse: the Token States
 * live on it. Only a GM may write them.
 */
export async function lapseEffectsAtTurnEnd(actor: Actor.Implementation, ended: CombatTurn, actorTurns: number[]) {
	const shortened: { _id: string; duration: ReturnType<typeof durationInRounds>; flags: { genesys: { lastCounted: CombatTurn } } }[] = [];
	const removed: string[] = [];
	for (const effect of actor.effects as Iterable<GenesysEffect>) {
		const rounds = effect.lapsingRounds;
		if (rounds === undefined) {
			continue;
		}

		const lapse = lapseAtTurnEnd(
			{
				rounds,
				appliedDuring: turnFlag(effect, FLAG_APPLIED_DURING),
				lastCounted: turnFlag(effect, FLAG_LAST_COUNTED),
			},
			ended,
			actorTurns,
		);
		if (lapse?.kind === 'shorten') {
			// The round counted, so that it doesn't count again once the GM goes back in the combat and ends a turn again.
			shortened.push({
				_id: effect.id!,
				duration: durationInRounds(lapse.rounds),
				flags: { genesys: { [FLAG_LAST_COUNTED]: ended } },
			});
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
