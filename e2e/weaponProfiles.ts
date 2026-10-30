/** @file The dagger of Realms of Terrinoth (pp. 92–96), a melee weapon also thrown, which the scenarios of #366 give an actor. */

/**
 * The dagger's Thrown profile, attacked with these skills: Brawn +2, Critical 4, Short, Accurate 1 and Limited Ammo 1.
 */
export function thrownProfile(skills: string[]) {
	return {
		name: 'Thrown',
		skills,
		damageCharacteristic: 'brawn',
		baseDamage: 2,
		critical: 4,
		range: 'short',
		qualities: [
			{ name: 'Accurate', description: '<p>Aims true.</p>', isRated: true, rating: 1 },
			{ name: 'Limited Ammo', description: '', isRated: true, rating: 1 },
		],
		attackSkill: '',
	};
}

/**
 * The equipped dagger `E2E Dagger`, its main profile attacked with the skills of `main` (Brawn +1, Critical 3,
 * Engaged, encumbrance 1), with the Thrown profile attacked with those of `thrown`.
 */
export function dagger({ main, thrown }: { main: string[]; thrown: string[] }) {
	return {
		name: 'E2E Dagger',
		type: 'weapon',
		system: {
			skills: main,
			damageCharacteristic: 'brawn',
			baseDamage: 1,
			critical: 3,
			range: 'engaged',
			encumbrance: 1,
			state: 'equipped',
			extraProfiles: [thrownProfile(thrown)],
		},
	};
}
