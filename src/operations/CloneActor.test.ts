/** @file Tests for the data of the clone of an actor. */

import { describe, expect, it } from 'vitest';

import { cloneSource } from '@/operations/CloneActor';

const rival = {
	_id: 'rival1',
	name: 'Bandit',
	type: 'rival',
	system: { wounds: { value: 2, max: 12 } },
	flags: { genesys: { other: 1 }, module: { kept: true } },
	prototypeToken: { actorLink: false, disposition: -1 },
};

describe('cloneSource', () => {
	it('copies the actor under the given name, with a linked token, keeping its data and flags', () => {
		expect(cloneSource(rival, 'Bandit chief')).toEqual({
			...rival,
			name: 'Bandit chief',
			prototypeToken: { actorLink: true, disposition: -1 },
		});
	});

	it("keeps the actor's name when no name is given", () => {
		expect(cloneSource(rival, '').name).toBe('Bandit');
	});

	it('flags the clone of a minion as an independent minion, keeping its other flags', () => {
		expect(cloneSource({ ...rival, type: 'minion' }, 'Lone bandit').flags).toEqual({
			genesys: { other: 1, independentMinion: true },
			module: { kept: true },
		});
	});

	it('leaves the actor it copies as it is', () => {
		const source = structuredClone(rival);
		cloneSource(source, 'Bandit chief');

		expect(source).toEqual(rival);
	});
});
