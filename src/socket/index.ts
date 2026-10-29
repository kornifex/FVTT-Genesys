import * as log from '@/log';
import { createRelay, type SocketPayload, SocketOperation } from '@/socket/Relay';

export { SocketOperation };

// The socket Foundry opens for a system: `system.<id>`.
const SOCKET_NAME = 'system.genesys';

// Foundry's users are read at each call: they connect and leave during the game.
const relay = createRelay({
	userId: () => game.user.id,
	users: () => game.users.map((user) => ({ id: user.id, role: user.role, active: user.active })),
	send: (payload) => game.socket.emit(SOCKET_NAME, payload),
});

/**
 * Sends an operation through the system's socket, to the Acting GM or to every other client; see {@link SocketOperation}.
 */
export const emit = relay.emit;

/**
 * Sets the one handler of a socket operation.
 */
export const handle = relay.handle;

/**
 * Whether this client's user is the Acting GM: the one GM who acts for the whole table.
 */
export const isActingGm = relay.isActingGm;

/**
 * Listens to the system's socket: the only listener, which dispatches each operation to its handler.
 */
export function register() {
	game.socket.on(SOCKET_NAME, (payload: SocketPayload) => {
		relay.receive(payload).catch((error: unknown) => log.error(`The socket operation ${payload.operation} failed`, error));
	});
}
