/** @file The system's socket relay: the catalogue of its operations, their dispatch, and the election of the Acting GM. */
import type { ExtraSlotInitiative } from '@/combat/InitiativeSlots';

/**
 * Every operation the system sends through its socket. Each one carries the data {@link SocketData} gives it.
 */
export enum SocketOperation {
	/**
	 * A player spends a Story Point from the player pool: the Acting GM writes it.
	 */
	PlayerSpendStoryPoint,

	/**
	 * Every client renders the Story Point Tracker again.
	 */
	UpdateStoryPointTracker,

	/**
	 * A player claims an Initiative Slot: the Acting GM writes the Claim.
	 */
	ClaimInitiativeSlot,

	/**
	 * Every client orders the turns of a combat again.
	 */
	UpdateCombatTracker,

	/**
	 * A player rolled the initiative of Extra Slots: the Acting GM writes it.
	 */
	UpdateInitiativeForExtraSlot,
}

/**
 * The data of {@link SocketOperation.PlayerSpendStoryPoint}.
 */
export type PlayerSpendStoryPointData = {
	/**
	 * The player who spends the Story Point: Foundry's socket doesn't tell who sent a message.
	 */
	userId: string;
};

type CombatSocketBaseData = {
	/**
	 * The combat the operation is for.
	 */
	combatId: string;
};

type ClaimInitiativeSlotData = CombatSocketBaseData & {
	/**
	 * Combatant ID claiming the slot.
	 */
	combatantId: string;

	/**
	 * Round to claim a slot in.
	 */
	round: number;

	/**
	 * Id of the Initiative Slot to claim.
	 */
	slotId: string;
};

type UpdateInitiativeForExtraSlotData = CombatSocketBaseData & {
	/**
	 * An array of updates to apply to the extra initiative slots.
	 */
	updates: ExtraSlotInitiative[];

	/**
	 * If the combat turn should be updated after adding the new initiative values.
	 */
	updateTurn: boolean;
};

/**
 * The data each operation carries.
 */
type SocketData = {
	[SocketOperation.PlayerSpendStoryPoint]: PlayerSpendStoryPointData;
	[SocketOperation.UpdateStoryPointTracker]: undefined;
	[SocketOperation.ClaimInitiativeSlot]: ClaimInitiativeSlotData;
	[SocketOperation.UpdateCombatTracker]: CombatSocketBaseData;
	[SocketOperation.UpdateInitiativeForExtraSlot]: UpdateInitiativeForExtraSlotData;
};

/**
 * What goes through the socket: an operation and its data.
 */
export type SocketPayload = { [O in SocketOperation]: { operation: O; data: SocketData[O] } }[SocketOperation];

/**
 * The clients each operation is for: every other client, or the Acting GM alone.
 */
const RECIPIENTS: Record<SocketOperation, 'everyone' | 'actingGm'> = {
	[SocketOperation.PlayerSpendStoryPoint]: 'actingGm',
	[SocketOperation.UpdateStoryPointTracker]: 'everyone',
	[SocketOperation.ClaimInitiativeSlot]: 'actingGm',
	[SocketOperation.UpdateCombatTracker]: 'everyone',
	[SocketOperation.UpdateInitiativeForExtraSlot]: 'actingGm',
};

type Handler<O extends SocketOperation> = (data: SocketData[O]) => unknown;

/**
 * A user of the world, as the election of the Acting GM reads it.
 */
export type RelayUser = {
	id: string;
	/** Foundry's role: 3 for an Assistant GM, 4 for a Gamemaster. */
	role: number;
	/** Whether the user is connected. */
	active: boolean;
};

/**
 * What the relay needs from the clients' connection: Foundry's socket and users, or an in-memory world in the tests.
 */
type RelayTransport = {
	/** The user of this client. */
	userId(): string;
	users(): Iterable<RelayUser>;
	/** Sends a payload to every other connected client; the sender doesn't receive it. */
	send(payload: SocketPayload): void;
};

// Foundry's roles: an Assistant GM is a GM too.
const ASSISTANT_ROLE = 3;

/**
 * The Acting GM: the connected GM of the highest role, then of the lowest id; undefined when no GM is connected.
 *
 * It is the user Foundry's `game.users.activeGM` returns, on v13 and v14 alike (`Users#getDesignatedUser`): one rule, so
 * that every client elects the same GM, for every operation.
 */
function actingGm(users: Iterable<RelayUser>) {
	let elected: RelayUser | undefined;
	for (const user of users) {
		if (!user.active || user.role < ASSISTANT_ROLE) continue;
		// Foundry compares ids by code point, as `<` does.
		if (!elected || user.role > elected.role || (user.role === elected.role && user.id < elected.id)) elected = user;
	}
	return elected;
}

/**
 * The system's socket as each client sees it. Its functions use no `this`: the Foundry adapter exports them one by one.
 */
export type Relay = {
	/**
	 * Sends an operation to the clients it is for. An operation for the Acting GM is sent only when a GM is connected:
	 * returns whether it was sent.
	 */
	emit: <O extends SocketOperation>(operation: O, ...data: SocketData[O] extends undefined ? [] : [SocketData[O]]) => boolean;
	/**
	 * Sets the one handler of an operation.
	 */
	handle: <O extends SocketOperation>(operation: O, handler: Handler<O>) => void;
	/**
	 * Runs the handler of a payload another client sent.
	 */
	receive: (payload: SocketPayload) => Promise<void>;
	/** Whether this client's user is the Acting GM. */
	isActingGm: () => boolean;
	/** Whether a GM is connected. */
	hasActingGm: () => boolean;
};

/**
 * A relay for the system's socket over a transport.
 */
export function createRelay(transport: RelayTransport): Relay {
	const handlers = new Map<SocketOperation, Handler<SocketOperation>>();
	const hasActingGm = () => actingGm(transport.users()) !== undefined;
	const isActingGm = () => actingGm(transport.users())?.id === transport.userId();

	return {
		emit(operation, ...[data]) {
			if (RECIPIENTS[operation] === 'actingGm' && !hasActingGm()) {
				return false;
			}

			transport.send({ operation, data } as SocketPayload);
			return true;
		},

		handle(operation, handler) {
			if (handlers.has(operation)) {
				throw new Error(`The socket operation ${SocketOperation[operation]} already has a handler.`);
			}

			handlers.set(operation, handler as Handler<SocketOperation>);
		},

		async receive(payload) {
			// Every GM receives it: the Acting GM alone handles it, so that it is applied once.
			if (RECIPIENTS[payload.operation] === 'actingGm' && !isActingGm()) {
				return;
			}

			await handlers.get(payload.operation)?.(payload.data);
		},

		isActingGm,
		hasActingGm,
	};
}
