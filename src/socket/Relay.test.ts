import { describe, expect, it } from 'vitest';

import { createRelay, type Relay, type RelayUser, type SocketPayload, SocketOperation } from '@/socket/Relay';

const ROLES = { player: 1, assistant: 3, gamemaster: 4 };

/**
 * The in-memory adapter: clients joined to one world, whose relays send each other their payloads as Foundry's socket
 * does, to every other connected client.
 */
function world(users: (RelayUser & { name: string })[]) {
	const relays = new Map<string, Relay>();
	const handled: string[] = [];

	const join = (name: string) => {
		const self = users.find((user) => user.name === name)!;
		const relay = createRelay({
			userId: () => self.id,
			users: () => users,
			send: (payload: SocketPayload) => {
				for (const [other, otherRelay] of relays) {
					if (other !== name && users.find((user) => user.name === other)!.active) void otherRelay.receive(payload);
				}
			},
		});
		relay.handle(SocketOperation.PlayerSpendStoryPoint, ({ userId }) => {
			handled.push(`${name}: PlayerSpendStoryPoint by ${userId}`);
		});
		relay.handle(SocketOperation.UpdateStoryPointTracker, () => {
			handled.push(`${name}: UpdateStoryPointTracker`);
		});
		relay.handle(SocketOperation.ClaimInitiativeSlot, ({ slotId }) => {
			handled.push(`${name}: ClaimInitiativeSlot ${slotId}`);
		});
		relay.handle(SocketOperation.UpdateCombatTracker, ({ combatId }) => {
			handled.push(`${name}: UpdateCombatTracker ${combatId}`);
		});
		relay.handle(SocketOperation.UpdateInitiativeForExtraSlot, ({ updates }) => {
			handled.push(`${name}: UpdateInitiativeForExtraSlot ${updates.length}`);
		});
		relays.set(name, relay);
		return relay;
	};

	for (const user of users) if (user.active) join(user.name);
	return { relay: (name: string) => relays.get(name)!, handled };
}

const gm = { name: 'GM', id: 'b', role: ROLES.gamemaster, active: true };
const assistant = { name: 'Assistant', id: 'a', role: ROLES.assistant, active: true };
const player = { name: 'Player', id: 'c', role: ROLES.player, active: true };

describe('createRelay', () => {
	it('sends an operation for every client to each other client', () => {
		const { relay, handled } = world([gm, assistant, player]);

		relay('GM').emit(SocketOperation.UpdateStoryPointTracker);

		expect(handled).toEqual(['Assistant: UpdateStoryPointTracker', 'Player: UpdateStoryPointTracker']);
	});

	it('sends an operation for the Acting GM to the Gamemaster alone, over an Assistant GM with a lower id', () => {
		const { relay, handled } = world([gm, assistant, player]);

		relay('Player').emit(SocketOperation.PlayerSpendStoryPoint, { userId: player.id });

		expect(handled).toEqual(['GM: PlayerSpendStoryPoint by c']);
	});

	it('elects the connected Assistant GM of the lowest id when no Gamemaster is connected', () => {
		const second = { name: 'Second', id: 'd', role: ROLES.assistant, active: true };
		const { relay, handled } = world([{ ...gm, active: false }, second, assistant, player]);

		relay('Player').emit(SocketOperation.ClaimInitiativeSlot, { combatId: 'x', combatantId: 'y', round: 1, slotId: 'y:-1' });

		expect(handled).toEqual(['Assistant: ClaimInitiativeSlot y:-1']);
	});

	it('tells each client whether its user is the Acting GM, and whether a GM is connected', () => {
		const { relay } = world([gm, assistant, player]);
		const alone = world([{ ...gm, active: false }, { ...assistant, active: false }, player]);

		expect(['GM', 'Assistant', 'Player'].map((name) => relay(name).isActingGm())).toEqual([true, false, false]);
		expect([relay('Player').hasActingGm(), alone.relay('Player').hasActingGm()]).toEqual([true, false]);
	});

	it('sends nothing for the Acting GM when no GM is connected', () => {
		const { relay, handled } = world([
			{ ...gm, active: false },
			{ ...assistant, active: false },
			player,
			{ ...player, name: 'Other', id: 'e' },
		]);

		const sent = relay('Player').emit(SocketOperation.PlayerSpendStoryPoint, { userId: player.id });

		expect({ sent, handled }).toEqual({ sent: false, handled: [] });
	});

	it('runs the handler of each operation', () => {
		const { relay, handled } = world([gm, player]);

		relay('Player').emit(SocketOperation.PlayerSpendStoryPoint, { userId: player.id });
		relay('Player').emit(SocketOperation.ClaimInitiativeSlot, { combatId: 'x', combatantId: 'y', round: 1, slotId: 'y:-1' });
		relay('Player').emit(SocketOperation.UpdateInitiativeForExtraSlot, { combatId: 'x', updates: [], updateTurn: true });
		relay('GM').emit(SocketOperation.UpdateStoryPointTracker);
		relay('GM').emit(SocketOperation.UpdateCombatTracker, { combatId: 'x' });

		expect(handled).toEqual([
			'GM: PlayerSpendStoryPoint by c',
			'GM: ClaimInitiativeSlot y:-1',
			'GM: UpdateInitiativeForExtraSlot 0',
			'Player: UpdateStoryPointTracker',
			'Player: UpdateCombatTracker x',
		]);
	});

	it('refuses a second handler for an operation', () => {
		const { relay } = world([gm, player]);

		expect(() => relay('GM').handle(SocketOperation.UpdateCombatTracker, () => undefined)).toThrow(
			'The socket operation updateCombatTracker already has a handler.',
		);
	});
});
