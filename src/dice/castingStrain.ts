/** @file The strain a spell's caster suffers once the check to cast it is resolved. */

import type { GenesysActor } from '@/actor/GenesysActor';

/**
 * Make an actor suffer strain, when they track it. Their strain may go past its threshold: the update's Threshold States
 * then incapacitate them.
 */
export async function sufferStrain(actor: GenesysActor, strain: number) {
	const pool = 'strain' in actor.system ? actor.system.strain : undefined;
	if (pool) {
		await actor.update({ system: { strain: { value: pool.value + strain } } });
	}
}
