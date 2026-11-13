import { ActorPlanner, EmbeddedUpdate } from '@/migrations/ActorMigration';

/** What this migration reads of a change: v13 gives it a numeric mode, v14 a type. */
type ChangeSource = { key: string; mode?: number; type?: string };

/** What this migration reads of an effect: v13 keeps its changes in `changes`, v14 in `system.changes`. */
type EffectSource = { _id: string; statuses?: string[]; changes?: ChangeSource[]; system?: { changes?: ChangeSource[] } };

// The key each status of 0.7.0-rc.1 added its defense to, and the one it now provides it with. The ids and keys are
// written out as rc.1 stored them, whatever later versions name them.
const REWRITTEN_KEYS: Record<string, { from: string; to: string }> = {
	cover: { from: 'system.defense.ranged', to: 'system.providedDefense.ranged' },
	guardedStance: { from: 'system.defense.melee', to: 'system.providedDefense.melee' },
};

// v13: `CONST.ACTIVE_EFFECT_MODES.ADD` and `.UPGRADE`, which a pure planner can't read.
const V13_ADD_MODE = 2;
const V13_UPGRADE_MODE = 4;

/**
 * 0.7.0-rc.1's In Cover state and Guarded Stance maneuver added their defense to the actor's own, so that it stacked
 * with their armor's. Cover and Guarded Stance provide defense, which doesn't stack: the actor keeps the best (CRB p.
 * 106). This planner rewrites the changes of the actor's effects that hold those statuses to provide it, with the
 * Upgrade mode, keeping their value and their other fields. Only a change in the Add mode is rewritten: one a user set to
 * another mode isn't what rc.1 wrote. Other effects keep increasing the actor's own defense.
 */
export const maneuverEffectsProvideDefense: ActorPlanner = (source) => {
	const effects: EmbeddedUpdate[] = [];
	// The type system can't see the shape of a stored effect, which EmbeddedSource leaves open: v13 and v14 store it differently.
	for (const effect of source.effects as EffectSource[]) {
		const rewrites = (effect.statuses ?? []).flatMap((status) => REWRITTEN_KEYS[status] ?? []);
		const isV14 = Array.isArray(effect.system?.changes);
		const changes = (isV14 ? effect.system?.changes : effect.changes) ?? [];
		const rewriteOf = (change: ChangeSource) =>
			(isV14 ? change.type === 'add' : change.mode === V13_ADD_MODE) ? rewrites.find(({ from }) => change.key === from) : undefined;
		if (!changes.some((change) => rewriteOf(change))) {
			continue;
		}

		const rewritten = changes.map((change) => {
			const rewrite = rewriteOf(change);
			if (!rewrite) {
				return change;
			}
			return { ...change, key: rewrite.to, ...(isV14 ? { type: 'upgrade' } : { mode: V13_UPGRADE_MODE }) };
		});
		effects.push(isV14 ? { _id: effect._id, system: { changes: rewritten } } : { _id: effect._id, changes: rewritten });
	}

	return effects.length > 0 ? { effects } : undefined;
};
