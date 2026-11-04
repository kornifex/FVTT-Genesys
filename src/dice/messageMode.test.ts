import { describe, expect, it } from 'vitest';

import { initiativeMessageMode } from '@/dice/messageMode';

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
