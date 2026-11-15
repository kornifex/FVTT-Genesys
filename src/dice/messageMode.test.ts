import { describe, expect, it } from 'vitest';

import { initiativeMessageMode, requestedInitiativeMode } from '@/dice/messageMode';

describe('requestedInitiativeMode', () => {
	it('reads the message mode, or the legacy roll mode of the message options as its message mode', () => {
		expect(requestedInitiativeMode({ messageMode: 'blind' })).toBe('blind');
		expect(requestedInitiativeMode({ messageOptions: { rollMode: 'gmroll' } })).toBe('gm');
		expect(requestedInitiativeMode({ messageOptions: { rollMode: 'selfroll' } })).toBe('self');
		// `roll` is the chat's own mode, as no mode asked for is.
		expect(requestedInitiativeMode({ messageOptions: { rollMode: 'roll' } })).toBeUndefined();
		expect(requestedInitiativeMode({})).toBeUndefined();
	});
});

describe('initiativeMessageMode', () => {
	it('gives the mode a caller asks for, even for a hidden combatant', () => {
		expect(initiativeMessageMode({ requested: 'self', hidden: true })).toBe('self');
		expect(initiativeMessageMode({ requested: 'public', hidden: false })).toBe('public');
	});

	it("hides a hidden combatant's initiative from the players when no mode is asked for", () => {
		expect(initiativeMessageMode({ hidden: true })).toBe('gm');
	});

	it("leaves a shown combatant's initiative to the chat's mode when no mode is asked for", () => {
		expect(initiativeMessageMode({ hidden: false })).toBeUndefined();
	});
});
