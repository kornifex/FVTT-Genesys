/** @file Runs every check of the CI workflow (`.github/workflows/ci.yml`) in order, keeps going after a failure, and fails if any did. */

import { spawnSync } from 'child_process';
import fs from 'fs';
import process from 'process';

import { stepsAfterInstall } from './ciSteps.ts';

let steps;
try {
	steps = stepsAfterInstall(fs.readFileSync('.github/workflows/ci.yml', 'utf8'));
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}

const failed: string[] = [];
const outcomes: string[] = [];
for (const { name, command } of steps) {
	console.log(`\n> ${name}: ${command}`);
	const passed = spawnSync(command, { shell: true, stdio: 'inherit' }).status === 0;
	outcomes.push(`${passed ? 'passed' : 'FAILED'}  ${name}`);
	if (!passed) {
		failed.push(name);
	}
}

console.log(`\n${outcomes.join('\n')}`);
if (failed.length > 0) {
	process.exitCode = 1;
}
