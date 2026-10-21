/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @file Tests for the encumbrance of equipment held in containers.
 */

import { describe, expect, it } from 'vitest';
import { HeldContainer, rootContainer } from '@/actor/data/character/Encumbrance';

type Container = HeldContainer & { id: string };

function containers(...held: [string, string][]) {
	const byId = new Map<string, Container>(held.map(([id, container]) => [id, { id, container }]));
	return (id: string) => byId.get(id);
}

describe('rootContainer', () => {
	it('is the container itself when it is not held in another one', () => {
		expect(rootContainer('backpack', containers(['backpack', '']))?.id).toBe('backpack');
	});

	it('walks up to the outermost container', () => {
		const getContainer = containers(['pouch', 'satchel'], ['satchel', 'backpack'], ['backpack', '']);

		expect(rootContainer('pouch', getContainer)?.id).toBe('backpack');
	});

	it('is undefined when a container is missing', () => {
		expect(rootContainer('pouch', containers(['pouch', 'gone']))).toBeUndefined();
		expect(rootContainer('gone', containers())).toBeUndefined();
	});

	it('is undefined when the containers hold each other', () => {
		expect(rootContainer('pouch', containers(['pouch', 'satchel'], ['satchel', 'pouch']))).toBeUndefined();
		expect(rootContainer('pouch', containers(['pouch', 'pouch']))).toBeUndefined();
	});
});
