import type { KnipConfig } from 'knip';

export default {
	// Foundry loads Genesys.js in development, through the Vite server.
	// e2e/run.ts loads the scenario file given on its command line.
	entry: ['Genesys.js', 'e2e/scenarios/*.ts'],
	// Foundry loads the scripts of public/ itself, and types/ holds Foundry's types.
	ignore: ['public/**', 'types/**'],
	// The local type roots of tsconfig.json.
	ignoreUnresolved: ['foundry', 'foundry-v13', 'dice-so-nice'],
	paths: { '@scss/*': ['src/scss/*'] },
} satisfies KnipConfig;
