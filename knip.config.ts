import type { KnipConfig } from 'knip';

export default {
	// Foundry loads Genesys.js in development, through the Vite server.
	// e2e/run.ts loads the scenario file given on its command line.
	entry: ['Genesys.js', 'e2e/scenarios/*.ts'],
	// The local type root of tsconfig.json.
	ignoreUnresolved: ['dice-so-nice'],
	paths: { '@scss/*': ['src/scss/*'] },
} satisfies KnipConfig;
