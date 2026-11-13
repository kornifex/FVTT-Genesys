import { describe, expect, it } from 'vitest';

import { stepsAfterInstall } from './ciSteps.ts';

const workflow = (steps: string) => `
jobs:
  checks:
    steps:
${steps}
`;

describe('stepsAfterInstall', () => {
	it('returns the run steps after the install step, in order', () => {
		const text = workflow(`
      - uses: actions/checkout@v7
      - name: Install Dependencies
        run: pnpm install --frozen-lockfile
      - name: Lint
        run: pnpm lint
      - uses: some/action@v1
      - name: Test
        run: pnpm test
`);

		expect(stepsAfterInstall(text)).toEqual([
			{ name: 'Lint', command: 'pnpm lint' },
			{ name: 'Test', command: 'pnpm test' },
		]);
	});

	it('names an unnamed step after its command', () => {
		const text = workflow(`
      - run: pnpm install
      - run: pnpm lint
`);

		expect(stepsAfterInstall(text)).toEqual([{ name: 'pnpm lint', command: 'pnpm lint' }]);
	});

	it('rejects a workflow without the checks job', () => {
		expect(() => stepsAfterInstall('jobs:\n  other:\n    steps: []\n')).toThrow('no `checks` job');
		expect(() => stepsAfterInstall('name: CI\n')).toThrow('no `checks` job');
	});

	it('rejects a job without an install step', () => {
		expect(() => stepsAfterInstall(workflow('      - run: pnpm lint'))).toThrow('no `pnpm install` step');
	});

	it('rejects a job with no run step after the install step', () => {
		const text = workflow(`
      - run: pnpm install
      - uses: some/action@v1
`);

		expect(() => stepsAfterInstall(text)).toThrow('no `run` step');
	});
});
