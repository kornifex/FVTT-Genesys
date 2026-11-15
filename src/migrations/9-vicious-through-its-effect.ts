import { ItemPlanner, ItemSource } from '@/migrations/ItemMigration';

/** What this migration reads of a quality as a weapon holds it: the copy is written back whole, given an id. */
type QualityCopy = { id?: string; name: string };

/** What this migration reads of an effect. */
type EffectSource = { flags?: { genesys?: Record<string, unknown> }; system?: { changes?: { key: string }[] } };

/** What this migration reads of a weapon's data. */
type WeaponSystem = { qualities?: QualityCopy[]; extraProfiles?: { qualities: QualityCopy[] }[] };

// The key, the flag and the item types written out as 0.7.1 stores them, whatever later versions name them.
const INFLICTED_KEY = 'genesys.critical.inflicted';
const QUALITY_FLAG = 'quality';
const WEAPON_TYPES = ['weapon', 'vehicleWeapon'];

// Vicious adds 10 per rating to the Critical Injury rolls of the weapon's attacks (CRB p. 89).
const VICIOUS_BONUS = 10;

const nameKey = (name: string) => name.trim().toLowerCase();

const addsToInflicted = (effect: EffectSource) => (effect.system?.changes ?? []).some(({ key }) => key === INFLICTED_KEY);

function viciousEffect(name: string, qualityId?: string) {
	return {
		name,
		img: 'icons/svg/aura.svg',
		disabled: false,
		...(qualityId && { flags: { genesys: { [QUALITY_FLAG]: qualityId } } }),
		system: { changes: [{ key: INFLICTED_KEY, value: VICIOUS_BONUS, type: 'custom' }] },
	};
}

/**
 * Up to 0.7.1, a Critical Injury roll recognised Vicious by its name, and the qualities a world calls Vicious have no
 * effect for it. Since it goes through its quality's effect, as any quality does, this planner gives the effect to each
 * quality item named Vicious, and to each copy of it on a weapon, tagged with the copy, giving an id to a copy stored
 * without one: a change of +10 to the injuries inflicted, which the copy's rating scales. A quality or a copy that
 * already has an effect changing the injuries inflicted keeps what it has.
 * @param names The names Vicious goes by: its English name and the world language's.
 * @param newId Makes the id of a copy stored without one.
 */
export function viciousThroughItsEffect(names: readonly string[], newId: () => string): ItemPlanner {
	const viciousNames = new Set(names.map(nameKey));
	const isVicious = (name: string) => viciousNames.has(nameKey(name));

	return (source: ItemSource) => {
		// The type system can't see the shape of a stored effect, which ItemSource leaves open.
		const effects = source.effects as EffectSource[];

		if (source.type === 'quality') {
			return isVicious(source.name) && !effects.some(addsToInflicted) ? { createdEffects: [viciousEffect(source.name)] } : undefined;
		}

		if (!WEAPON_TYPES.includes(source.type)) {
			return undefined;
		}

		const hasViciousEffect = (id: string) =>
			effects.some((effect) => effect.flags?.genesys?.[QUALITY_FLAG] === id && addsToInflicted(effect));
		const createdEffects: object[] = [];
		const withEffects = (qualities: readonly QualityCopy[]) =>
			qualities.map((quality) => {
				if (!isVicious(quality.name) || (quality.id && hasViciousEffect(quality.id))) {
					return quality;
				}

				const id = quality.id || newId();
				createdEffects.push(viciousEffect(quality.name, id));
				return id === quality.id ? quality : { ...quality, id };
			});
		const changed = (before: readonly QualityCopy[], after: readonly QualityCopy[]) =>
			after.some((quality, i) => quality !== before[i]);

		const system = source.system as WeaponSystem;
		const qualities = system.qualities ?? [];
		const migratedQualities = withEffects(qualities);
		const profiles = system.extraProfiles ?? [];
		const migratedProfiles = profiles.map((profile) => ({ ...profile, qualities: withEffects(profile.qualities) }));
		if (createdEffects.length === 0) {
			return undefined;
		}

		const update = {
			...(changed(qualities, migratedQualities) && { 'system.qualities': migratedQualities }),
			...(profiles.some((profile, i) => changed(profile.qualities, migratedProfiles[i].qualities)) && {
				'system.extraProfiles': migratedProfiles,
			}),
		};
		return { ...(Object.keys(update).length > 0 && { update }), createdEffects };
	};
}
