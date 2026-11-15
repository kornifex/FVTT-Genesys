import { ActorPlanner, EmbeddedUpdate } from '@/migrations/ActorMigration';

/** What this migration reads of a change. */
type ChangeSource = { key: string; type?: string };

/**
 * What this migration reads of an effect. Foundry migrates an effect that a world stored before v14 as it loads it, so
 * that its changes are in its system and have a type.
 */
type EffectSource = { _id: string; statuses?: string[]; system?: { changes?: ChangeSource[] } };

// The key each status of 0.7.0-rc.1 added its defense to, and the one it now provides it with. The ids and keys are
// written out as rc.1 stored them, whatever later versions name them.
const REWRITTEN_KEYS: Record<string, { from: string; to: string }> = {
	cover: { from: 'system.defense.ranged', to: 'system.providedDefense.ranged' },
	guardedStance: { from: 'system.defense.melee', to: 'system.providedDefense.melee' },
};

/**
 * 0.7.0-rc.1's In Cover state and Guarded Stance maneuver added their defense to the actor's own, so that it stacked
 * with their armor's. Cover and Guarded Stance provide defense, which doesn't stack: the actor keeps the best (CRB p.
 * 106). This planner rewrites the changes of the actor's effects that hold those statuses to provide it, with the
 * Upgrade type, keeping their value and their other fields. Only a change of the Add type is rewritten: one a user set
 * to another type isn't what rc.1 wrote. Other effects keep increasing the actor's own defense.
 */
export const maneuverEffectsProvideDefense: ActorPlanner = (source) => {
	const effects: EmbeddedUpdate[] = [];
	// The type system can't see the shape of a stored effect, which EmbeddedSource leaves open.
	for (const effect of source.effects as EffectSource[]) {
		const rewrites = (effect.statuses ?? []).flatMap((status) => REWRITTEN_KEYS[status] ?? []);
		const changes = effect.system?.changes ?? [];
		const rewriteOf = (change: ChangeSource) => (change.type === 'add' ? rewrites.find(({ from }) => change.key === from) : undefined);
		if (!changes.some((change) => rewriteOf(change))) {
			continue;
		}

		const rewritten = changes.map((change) => {
			const rewrite = rewriteOf(change);
			return rewrite ? { ...change, key: rewrite.to, type: 'upgrade' } : change;
		});
		effects.push({ _id: effect._id, system: { changes: rewritten } });
	}

	return effects.length > 0 ? { effects } : undefined;
};
