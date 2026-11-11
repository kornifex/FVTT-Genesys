/** @file The Foundry edge of the Acting GM's queries: Foundry's `CONFIG.queries`, `game.users.activeGM` and notifications. */
import * as log from '@/log';
import { failureNotification, querierOf, queryActingGm, type QueryContext, type QueryData, type QueryName } from '@/queries/ActingGmQuery';

export { QueryName, refuse } from '@/queries/ActingGmQuery';

/**
 * The handler Foundry runs on the Acting GM's client for each query, with the context Foundry gives it.
 */
export type QueryHandlers = {
	[N in QueryName]: (data: QueryData[N], context?: QueryContext<User.Implementation>) => Promise<void>;
};

/**
 * Whether this client's user is the Acting GM: the one GM who acts for the whole table.
 */
export function isActingGm() {
	return game.users.activeGM?.isSelf ?? false;
}

/**
 * Sets the handler of a query, which receives the user who sent it. It refuses a query with {@link refuse}.
 */
export function handleQuery<N extends QueryName>(name: N, handler: (data: QueryData[N], querier: User.Implementation) => Promise<void>) {
	const queryHandler = (data: QueryData[N], context?: QueryContext<User.Implementation>) =>
		handler(
			data,
			querierOf(data, context, (id) => game.users.get(id)),
		);
	(CONFIG.queries as Record<N, typeof queryHandler>)[name] = queryHandler;
}

/**
 * Asks the Acting GM to write an operation, and warns the player when it wasn't.
 *
 * @param format - What the warning of a refusal is formatted with.
 * @returns Whether the Acting GM wrote it.
 */
export async function askActingGm<N extends QueryName>(name: N, data: Omit<QueryData[N], 'userId'>, format?: Record<string, string>) {
	// v13: the data names the user who asks, as Foundry v13 doesn't tell the handler.
	const failure = await queryActingGm(game.users.activeGM ?? undefined, name, { ...data, userId: game.user.id } as QueryData[N]);
	if (!failure) {
		return true;
	}

	if (failure.cause === 'failed') {
		log.error(`The Acting GM failed to answer the query ${name}`, failure.error);
	}

	ui.notifications.warn(game.i18n.format(failureNotification(failure, name), format));
	return false;
}
