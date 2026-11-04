import { describe, expect, it } from 'vitest';

import { type ActingGm, queryActingGm, failureNotification, QueryName, querierOf, refuse } from '@/queries/ActingGmQuery';

/**
 * The in-memory adapter: an Acting GM answering as Foundry's server relays the answer, which keeps only the message of
 * an error the handler throws.
 */
function actingGm(handler: (name: string, data: unknown) => unknown): ActingGm & { asked: { name: string; timeout?: number }[] } {
	const asked: { name: string; timeout?: number }[] = [];
	return {
		asked,
		async query(name, data, { timeout }) {
			asked.push({ name, timeout });
			try {
				return await handler(name, data);
			} catch (error) {
				// eslint-disable-next-line preserve-caught-error -- Foundry's server passes on the message alone.
				throw new Error((error as Error).message);
			}
		},
	};
}

const spend = { userId: 'player' };

describe('queryActingGm', () => {
	it('asks the Acting GM, and tells of no failure once it answers', async () => {
		const gm = actingGm(() => undefined);

		const failure = await queryActingGm(gm, QueryName.SpendStoryPoint, spend);

		expect(failure).toBeUndefined();
		expect(gm.asked).toEqual([{ name: 'genesys.spendStoryPoint', timeout: 10_000 }]);
	});

	it('fails, asking no one, when no GM is connected', async () => {
		expect(await queryActingGm(undefined, QueryName.SpendStoryPoint, spend)).toEqual({ cause: 'noActingGm' });
	});

	it("fails with the handler's refusal when the Acting GM refuses", async () => {
		const gm = actingGm(() => refuse('Genesys.Notifications.SlotAlreadyClaimed'));

		expect(await queryActingGm(gm, QueryName.SpendStoryPoint, spend)).toEqual({
			cause: 'refused',
			refusal: 'Genesys.Notifications.SlotAlreadyClaimed',
		});
	});

	it("fails as timed out when the Acting GM doesn't answer in time", async () => {
		// The error socket.io gives Foundry's server once the query's timeout elapsed.
		const gm = actingGm(() => {
			throw new Error('operation has timed out');
		});

		expect(await queryActingGm(gm, QueryName.SpendStoryPoint, spend)).toEqual({ cause: 'timedOut' });
	});

	it('fails with the error when the query fails otherwise', async () => {
		const gm = actingGm(() => {
			throw new TypeError("Cannot read properties of undefined (reading 'id')");
		});

		const failure = await queryActingGm(gm, QueryName.SpendStoryPoint, spend);

		expect(failure).toEqual({ cause: 'failed', error: new Error("Cannot read properties of undefined (reading 'id')") });
	});
});

describe('querierOf', () => {
	const users = new Map([
		['player', { name: 'Player' }],
		['other', { name: 'Other' }],
	]);
	const findUser = (id: string) => users.get(id);

	it('is the user Foundry v14 names as the sender, whatever user the data names', () => {
		expect(querierOf({ userId: 'other' }, { timeout: 10_000, user: users.get('player') }, findUser)).toEqual({ name: 'Player' });
	});

	it('is the user the data names on Foundry v13, which names no sender', () => {
		expect(querierOf({ userId: 'other' }, { timeout: 10_000 }, findUser)).toEqual({ name: 'Other' });
	});

	it('fails on Foundry v13 when the data names an unknown user', () => {
		expect(() => querierOf({ userId: 'gone' }, { timeout: 10_000 }, findUser)).toThrow('unknown user gone');
	});
});

describe('failureNotification', () => {
	const noGm = QueryName.ClaimInitiativeSlot;

	it("warns that no GM is connected with the operation's own key", () => {
		expect(failureNotification({ cause: 'noActingGm' }, QueryName.SpendStoryPoint)).toBe('Genesys.Notifications.NoGMForStoryPoint');
		expect(failureNotification({ cause: 'noActingGm' }, QueryName.ClaimInitiativeSlot)).toBe('Genesys.Notifications.NoGMForClaim');
		expect(failureNotification({ cause: 'noActingGm' }, QueryName.WriteExtraSlotInitiative)).toBe(
			'Genesys.Notifications.NoGMForExtraSlot',
		);
	});

	it('warns of the refusal the Acting GM gave', () => {
		expect(failureNotification({ cause: 'refused', refusal: 'Genesys.Notifications.SlotAlreadyClaimed' }, noGm)).toBe(
			'Genesys.Notifications.SlotAlreadyClaimed',
		);
	});

	it("warns that the GM didn't answer in time", () => {
		expect(failureNotification({ cause: 'timedOut' }, noGm)).toBe('Genesys.Notifications.ActingGMTimedOut');
	});

	it('shows the generic error for any other failure', () => {
		expect(failureNotification({ cause: 'failed', error: new Error('User [b] has disconnected') }, noGm)).toBe(
			'Genesys.Notifications.GenericError',
		);
	});
});
