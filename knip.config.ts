import type { KnipConfig } from 'knip';

export default {
	// Foundry loads Genesys.js in development, through the Vite server.
	entry: ['Genesys.js'],
	// Foundry loads the scripts of public/ itself, and types/ holds Foundry's types.
	ignore: ['public/**', 'types/**'],
	// The local type roots of tsconfig.json.
	ignoreUnresolved: ['foundry', 'dice-so-nice'],
	paths: { '@scss/*': ['src/scss/*'] },
} satisfies KnipConfig;
