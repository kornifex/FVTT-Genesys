import { afterEach, describe, expect, it, vi } from 'vitest';

import { initiativeMessageMode, requestedInitiativeMode } from '@/dice/messageMode';

describe('requestedInitiativeMode', () => {
	const onFoundry = (generation: number) => vi.stubGlobal('game', { release: { generation } });
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('reads the roll mode of the message options on v13', () => {
		onFoundry(13);
		expect(requestedInitiativeMode({ messageOptions: { rollMode: 'gmroll' } })).toBe('gmroll');
		expect(requestedInitiativeMode({})).toBeUndefined();
	});

	it('reads the message mode on v14, or the legacy roll mode of the message options as its message mode', () => {
		onFoundry(14);
		expect(requestedInitiativeMode({ messageMode: 'blind' })).toBe('blind');
		expect(requestedInitiativeMode({ messageOptions: { rollMode: 'gmroll' } })).toBe('gm');
		expect(requestedInitiativeMode({ messageOptions: { rollMode: 'selfroll' } })).toBe('self');
		// `roll` is the chat's own mode, as no mode asked for is.
		expect(requestedInitiativeMode({ messageOptions: { rollMode: 'roll' } })).toBeUndefined();
		expect(requestedInitiativeMode({})).toBeUndefined();
	});
});

// The modes as v14 names them; v13 gives its own names, which the choice passes on as they are.
const modes = { private: 'gm', chat: 'blind' };

describe('initiativeMessageMode', () => {
	it('gives the mode a caller asks for, even for a hidden combatant', () => {
		expect(initiativeMessageMode({ requested: 'self', hidden: true }, modes)).toBe('self');
		expect(initiativeMessageMode({ requested: 'public', hidden: false }, modes)).toBe('public');
	});

	it("hides a hidden combatant's initiative from the players when no mode is asked for", () => {
		expect(initiativeMessageMode({ hidden: true }, modes)).toBe('gm');
	});

	it("gives a shown combatant's initiative the chat's mode when no mode is asked for", () => {
		expect(initiativeMessageMode({ hidden: false }, modes)).toBe('blind');
	});
});
