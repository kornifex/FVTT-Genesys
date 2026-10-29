/** @file Tests for the dice the system gives Dice So Nice. */

import { describe, expect, it, vi } from 'vitest';

import { register } from '@/dice/diceSoNice';

/**
 * What the system registers with Dice So Nice once it is ready: its dice systems in order, its colorsets in the order
 * each category lists them, and its dice presets by dice system.
 */
function registered() {
	let onReady: ((dice3d: Dice3d) => void) | undefined;
	vi.stubGlobal('Hooks', {
		once: (hook: string, callback: (dice3d: Dice3d) => void) => hook === 'diceSoNiceReady' && (onReady = callback),
	});
	vi.spyOn(console, 'log').mockImplementation(() => {});
	register();

	const systems: unknown[] = [];
	const colorsets: Record<string, unknown[]> = {};
	const presets: Record<string, unknown[]> = {};
	onReady?.({
		addSystem: (system: unknown, mode: string) => systems.push({ system, mode }),
		addColorset: (colorset: ColorSet, mode: string) => (colorsets[colorset.category ?? ''] ??= []).push({ colorset, mode }),
		addDicePreset: (preset: { system: string }) => (presets[preset.system] ??= []).push(preset),
	} as unknown as Dice3d);

	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	return { systems, colorsets, presets };
}

describe('Dice So Nice', () => {
	// The snapshot was taken from the registration before it was rewritten as a loop over a table, so that the dice look
	// the same in Dice So Nice.
	it('registers the dice systems, colorsets and dice presets of the Genesys dice', () => {
		expect(registered()).toMatchSnapshot();
	});
});
