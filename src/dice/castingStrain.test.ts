/** @file Tests for the strain a spell's caster suffers, written by the roller or asked of the Acting GM. */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GenesysActor } from '@/actor/GenesysActor';
import type { CheckPurpose } from '@/dice/Check';
import { sufferCastingStrain } from '@/dice/castingStrain';

const curse: CheckPurpose = { kind: 'spell', spellName: 'Curse', isAttack: false };
// The check's message: only its id is read, to name it to the Acting GM.
const message = { id: 'message' } as ChatMessage.Implementation;

// The Acting GM, which records the queries a player's client sends it.
const query = vi.fn(async () => undefined);

beforeEach(() => {
	query.mockClear();
	vi.stubGlobal('game', { users: { activeGM: { query } }, user: { id: 'player' } });
});

/** An actor the roller may write or not, with a strain pool or none, which records the updates asked of it. */
function caster({ isOwner, strain }: { isOwner: boolean; strain?: number }) {
	const update = vi.fn();
	const system = strain === undefined ? {} : { strain: { value: strain } };
	// The cast reads only these of the actor.
	const actor = { name: 'Mage', uuid: 'Actor.mage', isOwner, system, update } as unknown as GenesysActor;
	return { actor, update };
}

describe('sufferCastingStrain', () => {
	it("makes the caster the roller writes suffer the spell's 2 strain", async () => {
		const { actor, update } = caster({ isOwner: true, strain: 3 });

		await sufferCastingStrain(actor, curse, message);

		expect(update).toHaveBeenCalledExactlyOnceWith({ system: { strain: { value: 5 } } });
		expect(query).not.toHaveBeenCalled();
	});

	it("asks the Acting GM to write an observed caster's strain, naming the check's message", async () => {
		const { actor, update } = caster({ isOwner: false, strain: 3 });

		await sufferCastingStrain(actor, curse, message);

		expect(query).toHaveBeenCalledExactlyOnceWith(
			'genesys.sufferCastingStrain',
			{ actorUuid: 'Actor.mage', messageId: 'message', userId: 'player' },
			expect.anything(),
		);
		expect(update).not.toHaveBeenCalled();
	});

	it('asks the Acting GM nothing for an observed caster who tracks no strain, as a minion', async () => {
		const { actor } = caster({ isOwner: false });

		await sufferCastingStrain(actor, curse, message);

		expect(query).not.toHaveBeenCalled();
	});

	it('costs a check that casts no spell nothing', async () => {
		const owned = caster({ isOwner: true, strain: 3 });
		const observed = caster({ isOwner: false, strain: 3 });

		await sufferCastingStrain(owned.actor, { kind: 'attack', weaponName: 'Sword' }, message);
		await sufferCastingStrain(observed.actor, { kind: 'check' }, message);

		expect(owned.update).not.toHaveBeenCalled();
		expect(query).not.toHaveBeenCalled();
	});
});
