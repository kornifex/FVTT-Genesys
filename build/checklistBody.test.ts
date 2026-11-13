import { describe, expect, it } from 'vitest';

import { addSection, headings, replaceSection, showSection, tickItem, untickedItems } from './checklistBody.ts';

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

describe('showSection by number', () => {
	const body = '## #733 fix(dice): spend no other Story Point (#725)\n\nA\n\n## #7330 Other (#7250)\n\nB\n\n## #740 See #733 (#723)\n\nC';

	it('finds a section by its pull request number or by its issue number', () => {
		expect(showSection(body, '#733')).toBe('## #733 fix(dice): spend no other Story Point (#725)\n\nA');
		expect(showSection(body, '#725')).toBe('## #733 fix(dice): spend no other Story Point (#725)\n\nA');
		expect(showSection(body, '#723')).toBe('## #740 See #733 (#723)\n\nC');
	});

	it('prefers the pull request number over the issue number', () => {
		expect(showSection(`${body}\n\n## #800 Again (#733)\n`, '#733')).toMatch(/^## #733 fix/);
	});

	it('refuses an issue number that two sections carry, naming them', () => {
		const twice = '## #800 First (#790)\n\nA\n\n## #801 Second (#790)\n\nB';

		expect(() => showSection(twice, '#790')).toThrow('2 section headings match "#790":\n## #800 First (#790)\n## #801 Second (#790)');
	});
});

describe('headings', () => {
	it('lists the section headings in order', () => {
		expect(headings(BODY)).toEqual([
			'## #467 A talent counts once per rank (#466)',
			'## #470 The Difficulty picked by clicking one of five dice (#469)',
			'## #37 Table tests that 0.4.0 ships without',
		]);
	});
});

describe('untickedItems', () => {
	it('lists the unticked items with their section heading', () => {
		const second = '## #470 The Difficulty picked by clicking one of five dice (#469)';

		expect(untickedItems(BODY)).toEqual([
			{ heading: '## #467 A talent counts once per rank (#466)', item: '- [ ] A talent counts once per rank.' },
			{ heading: second, item: '- [ ] The five dice at the table, in French.' },
			{ heading: second, item: '- [ ] The dice keep their upgrades.' },
			{ heading: '## #37 Table tests that 0.4.0 ships without', item: '- [ ] §#79 (#37): a full session.' },
		]);
	});

	it('gives an empty heading to an item before the first section', () => {
		expect(untickedItems('- [ ] Loose\n- [x] Done')).toEqual([{ heading: '', item: '- [ ] Loose' }]);
	});
});

describe('replaceSection', () => {
	it('replaces the section with the same heading and keeps the others', () => {
		const body = replaceSection(BODY, '## #470 The Difficulty picked by clicking one of five dice (#469)\n\n- [x] All proven.\n');

		expect(body).toBe(
			BODY.replace('- [ ] The five dice at the table, in French.\n- [ ] The dice keep their upgrades.', '- [x] All proven.'),
		);
	});

	it('finds the section by its number when the title changed', () => {
		const body = replaceSection(BODY, '## #470 A new title (#469)\n\n- [x] Fresh.');

		expect(headings(body)).toContain('## #470 A new title (#469)');
		expect(body).not.toContain('five dice at the table');
		expect(body).toContain('## #37 Table tests');
	});

	it('replaces the last section up to the end of the body', () => {
		expect(replaceSection('## #1 One\n\nA\n\n## #2 Two\n\nB\n', '## #2 Two\n\nC')).toBe('## #1 One\n\nA\n\n## #2 Two\n\nC\n');
	});

	it('refuses a section that no heading matches, or without a heading', () => {
		expect(() => replaceSection(BODY, '## #999 Nope')).toThrow('No section heading');
		expect(() => replaceSection(BODY, 'text')).toThrow('"## " heading');
	});
});
