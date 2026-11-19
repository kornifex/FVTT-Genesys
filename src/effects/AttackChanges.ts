/**
 * @file Attack Changes: the changes of an actor's effects that add to the damage or to the Critical rating of the attacks
 * the actor makes, as Battle Rage's +2 damage on a melee attack does (RoT p. 67).
 */

/**
 * What an Attack Change adds to: the damage of an attack, or its Critical rating.
 */
export const ATTACK_CHANGE_FIELDS = ['damage', 'critical'] as const;
export type AttackChangeField = (typeof ATTACK_CHANGE_FIELDS)[number];

/**
 * The attacks an Attack Change applies to: every combat check, or only the melee or only the ranged attacks.
 */
export const ATTACK_CHANGE_SCOPES = ['combat', 'melee', 'ranged'] as const;
export type AttackChangeScope = (typeof ATTACK_CHANGE_SCOPES)[number];

const PREFIX = 'genesys.attack';
const KEY_PATTERN = new RegExp(`^genesys\\.attack\\.(${ATTACK_CHANGE_FIELDS.join('|')})\\.(${ATTACK_CHANGE_SCOPES.join('|')})$`);

/**
 * The change key of an Attack Change, which {@link decodeAttackChangeKey} reads back.
 */
export function attackChangeKey(field: AttackChangeField, scope: AttackChangeScope) {
	return `${PREFIX}.${field}.${scope}`;
}

/**
 * The parts of a change key, or undefined if the change isn't an Attack Change.
 */
export function decodeAttackChangeKey(key: string): { field: AttackChangeField; scope: AttackChangeScope } | undefined {
	const match = key.match(KEY_PATTERN);
	// The pattern only matches the fields and the scopes listed above.
	return match ? { field: match[1] as AttackChangeField, scope: match[2] as AttackChangeScope } : undefined;
}

/**
 * Whether a change is an Attack Change.
 */
export function isAttackChangeKey(key: string) {
	return KEY_PATTERN.test(key);
}

/**
 * What the Attack Changes of one effect add to an attack, field by field.
 */
export type AttackChanges = Partial<Record<AttackChangeField, number>>;

/**
 * The Attack Changes an attack is rolled with, each named after the effect it comes from.
 */
export type NamedAttackChanges = AttackChanges & { name: string };

/**
 * A copy of the profile an attack is made with, changed by the Attack Changes it is rolled with. A Critical rating of 0
 * stays 0, since no Advantage triggers a Critical Injury then; any other stays at 1 or more, as an Item Change leaves it.
 */
export function changedAttack<Profile extends { baseDamage: number; critical: number }>(
	profile: Profile,
	changes: readonly AttackChanges[],
): Profile {
	const total = (field: AttackChangeField) => changes.reduce((sum, change) => sum + (change[field] ?? 0), 0);

	return {
		...profile,
		baseDamage: profile.baseDamage + total('damage'),
		critical: profile.critical === 0 ? 0 : Math.max(1, profile.critical + total('critical')),
	};
}
