import { ItemPlanner, ItemSource } from '@/migrations/ItemMigration';
import * as log from '@/log';

/** What this migration reads of a quality an Additional Effect gives: the skill it named up to 0.7.1, if any. */
type QualitySource = { ratingSource?: string; ratingSkill?: unknown };

/** What this migration reads of a spell's copy of an Additional Effect. */
type CopySource = { name?: string; qualities?: QualitySource[] };

/** What this migration reads of a spell's data, and writes into it. */
type SpellSystemSource = { ratingSkill?: unknown; additionalEffects?: CopySource[] };

// The item types, the rating source and the skill written out as 0.7.1 stores them, whatever later versions name them.
const SPELL_TYPE = 'spell';
const ADDITIONAL_EFFECT_TYPE = 'additionalEffect';
const SKILL_RANKS = 'skillRanks';
const KNOWLEDGE = 'Knowledge';

const namesASkill = (quality: QualitySource) => 'ratingSkill' in quality;

/**
 * Up to 0.7.1, each quality of an Additional Effect named the skill whose ranks its rating counted; the spell names it
 * since. This gives a spell's data stored that way the skill its copies' qualities rated by the caster's ranks counted,
 * when they all counted the same one, or Knowledge, which every effect of the Core Rulebook counts, and logs it when they
 * didn't. Data that already names its skill, or whose copies name none (a spell saved since, a partial update), is left
 * as it is. It runs on the source before Foundry drops the keys the schema no longer has, as `migrateData` does.
 */
export function withSpellRatingSkill(source: SpellSystemSource) {
	const copies = source.additionalEffects ?? [];
	if (source.ratingSkill !== undefined || !copies.some((copy) => copy.qualities?.some(namesASkill))) {
		return;
	}

	// A quality left with an empty skill counted no ranks, and names none.
	const counted = copies.flatMap((copy) =>
		(copy.qualities ?? []).flatMap(({ ratingSource, ratingSkill }) =>
			ratingSource === SKILL_RANKS && typeof ratingSkill === 'string' && ratingSkill.trim() !== ''
				? [{ effect: copy.name, skill: ratingSkill.trim() }]
				: [],
		),
	);
	const skills = new Set(counted.map(({ skill }) => skill));
	if (skills.size > 1) {
		const effects = counted.map(({ effect, skill }) => `${effect}: ${skill}`).join(', ');
		log.warn(`A spell's Additional Effects counted ranks in different skills (${effects}): the spell counts ${KNOWLEDGE}.`);
	}

	source.ratingSkill = skills.size === 1 ? [...skills][0] : KNOWLEDGE;
}

const withoutSkill = ({ ratingSkill: _, ...quality }: QualitySource) => quality;

/**
 * This migration's planner: it writes down the skill `migrateData` gave a spell, and drops the skill its copies' and the
 * Additional Effect items' qualities named. Foundry dropped those keys from the source as it loaded the item, but the
 * world still stores them until the item is written whole.
 */
export const spellsNameTheirRatingSkill: ItemPlanner = (source: ItemSource) => {
	if (source.type === SPELL_TYPE) {
		// The type system can't see the shape of a stored spell, which ItemSource leaves open.
		const system = { ...(source.system as SpellSystemSource) };
		withSpellRatingSkill(system);
		const copies = (system.additionalEffects ?? []).map((copy) => ({ ...copy, qualities: (copy.qualities ?? []).map(withoutSkill) }));
		return { update: { 'system.ratingSkill': system.ratingSkill ?? KNOWLEDGE, 'system.additionalEffects': copies } };
	}

	if (source.type === ADDITIONAL_EFFECT_TYPE) {
		// The type system can't see the shape of a stored Additional Effect, which ItemSource leaves open.
		const qualities = (source.system as { qualities?: QualitySource[] }).qualities ?? [];
		return qualities.length > 0 ? { update: { 'system.qualities': qualities.map(withoutSkill) } } : undefined;
	}

	return undefined;
};
