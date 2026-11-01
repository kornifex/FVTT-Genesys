import { describe, expect, it } from 'vitest';

import { addSection, showSection, tickItem } from './checklistBody.ts';

const BODY = [
	'**Still to test at the table**',
	'',
	'- §#470 the five dice',
	'',
	'## #467 A talent counts once per rank (#466)',
	'',
	'Intended changes:',
	'- [ ] A talent counts once per rank.',
	'- [x] Its token too.',
	'',
	'## #470 The Difficulty picked by clicking one of five dice (#469)',
	'',
	'- [ ] The five dice at the table, in French.',
	'- [ ] The dice keep their upgrades.',
	'',
	'## #37 Table tests that 0.4.0 ships without',
	'',
	'- [ ] §#79 (#37): a full session.',
].join('\n');

describe('addSection', () => {
	it('inserts the section before the trailing #37 carry-over section', () => {
		const body = addSection(BODY, '\n## #476 Terse e2e lines (#472)\n\n- [x] A passed step prints ✓.\n\n');

		expect(body).toBe(
			BODY.replace('## #37 Table tests', '## #476 Terse e2e lines (#472)\n\n- [x] A passed step prints ✓.\n\n## #37 Table tests'),
		);
	});

	it('appends the section when the last section is not the carry-over one', () => {
		const body = addSection('## #1 One\n\n- [x] Done.\n\n\n', '## #2 Two');

		expect(body).toBe('## #1 One\n\n- [x] Done.\n\n## #2 Two\n');
	});

	it('appends after a #37 section that is not the last one', () => {
		const body = addSection('## #37 First\n\n## #40 Later\n', '## #41 New');

		expect(body).toBe('## #37 First\n\n## #40 Later\n\n## #41 New\n');
	});

	it('refuses a section without a heading', () => {
		expect(() => addSection(BODY, '- [ ] An item.')).toThrow('"## " heading');
	});
});

describe('tickItem', () => {
	it('ticks the one unticked item that contains the text, and returns it', () => {
		const { body, item } = tickItem(BODY, 'once per rank');

		expect(item).toBe('- [x] A talent counts once per rank.');
		expect(body).toBe(BODY.replace('- [ ] A talent counts', '- [x] A talent counts'));
	});

	it('appends the note', () => {
		const { item } = tickItem(BODY, 'five dice at the table', '`e2e/scenarios/dicePrompt.ts › step "#469 P4"`');

		expect(item).toBe('- [x] The five dice at the table, in French. `e2e/scenarios/dicePrompt.ts › step "#469 P4"`');
	});

	it('ticks an indented item', () => {
		const { item } = tickItem('- [x] Parent\n  - [ ] Child item', 'Child');

		expect(item).toBe('  - [x] Child item');
	});

	it('leaves the ticked items and the text outside items alone', () => {
		expect(() => tickItem(BODY, 'Its token')).toThrow('No unticked item contains "Its token".');
		expect(() => tickItem(BODY, 'the five dice')).toThrow('No unticked item');
	});

	it('refuses a text that several unticked items contain, naming their lines', () => {
		expect(() => tickItem(BODY, 'The ')).toThrow('2 unticked items contain "The ", on lines 13, 14.');
	});
});

describe('showSection', () => {
	it('returns the section whose heading starts with the text, up to the next heading', () => {
		expect(showSection(BODY, '#470')).toBe(
			[
				'## #470 The Difficulty picked by clicking one of five dice (#469)',
				'',
				'- [ ] The five dice at the table, in French.',
				'- [ ] The dice keep their upgrades.',
			].join('\n'),
		);
	});

	it('prefers the heading that starts with the text over those that contain it', () => {
		const body = '## #37 Carried\n\nA\n\n## #370 Other (#37)\n\nB';

		expect(showSection(body, '#37')).toBe('## #37 Carried\n\nA');
	});

	it('falls back to the one heading that contains the text', () => {
		expect(showSection(BODY, '(#466)')).toMatch(/^## #467 .*\n\nIntended changes:\n- \[ \] A talent/);
	});

	it('returns the last section up to the end of the body', () => {
		expect(showSection(BODY, '#37')).toBe('## #37 Table tests that 0.4.0 ships without\n\n- [ ] §#79 (#37): a full session.');
	});

	it('refuses a text that no heading or several headings contain, naming them', () => {
		expect(() => showSection(BODY, '#999')).toThrow('No section heading contains "#999".');
		expect(() => showSection(BODY, 'clicking')).not.toThrow();
		expect(() => showSection(BODY, ' (#4')).toThrow('2 section headings match " (#4":\n## #467');
	});
});
