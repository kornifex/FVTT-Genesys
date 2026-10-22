import { AliasOptions, defineConfig } from 'vite';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import pluginVue from '@vitejs/plugin-vue';
import path from 'path';
import process from 'process';

import { yamlData } from './build/yamlData.ts';

const env = dotenv.config();
dotenvExpand.expand(env);

const PROXY_HOST = process.env.VITE_PROXY_HOST ?? 'localhost';
const PROXY_PORT = process.env.VITE_PROXY_PORT ?? 30000;

/**
 * A list of aliases to be applied only in production.
 */
let releaseOnlyAliases: AliasOptions = [];

if (process.env.NODE_ENV === 'production') {
	releaseOnlyAliases = [{ find: 'vue', replacement: path.resolve(import.meta.dirname, 'node_modules/vue/dist/vue.esm-browser.prod.js') }];
}

// https://vitejs.dev/config/
export default defineConfig({
	// Proxy w/Foundry. See https://foundryvtt.wiki/en/development/guides/vite
	base: '/systems/genesys',
	server: {
		port: 30001,
		open: false,
		proxy: {
			'^/assets': `http://${PROXY_HOST}:${PROXY_PORT}/systems/genesys/`,
			'^(?!/systems/genesys)': `http://${PROXY_HOST}:${PROXY_PORT}/`,
			'/socket.io': {
				target: `ws://${PROXY_HOST}:${PROXY_PORT}`,
				ws: true,
			},
		},
	},
	publicDir: 'public',
	build: {
		outDir: 'dist',
		// v12: the oldest browsers Foundry v12 accepts; Vite's default target is newer.
		target: ['chrome105', 'firefox121', 'safari15.4'],
		emptyOutDir: true,
		sourcemap: true,
		// Avoiding minification is important, because we don't want names of globals/etc. to be mangled.
		minify: false,
		lib: {
			name: 'Genesys',
			entry: 'src/Genesys.ts',
			formats: ['es'], // ES Modules
			fileName: 'Genesys',
			// system.yml loads the styles from style.css, the name Vite gave the CSS of a library before Vite 6.
			cssFileName: 'style',
		},
	},
	experimental: {
		// The chance worker loads from a URL relative to Genesys.js, so that it still resolves when Foundry serves its
		// routes under a prefix.
		renderBuiltUrl: (_, { hostType }) => (hostType === 'js' ? { relative: true } : undefined),
	},
	plugins: [pluginVue(), yamlData('yaml')],
	resolve: {
		alias: [
			{ find: '@', replacement: path.resolve(import.meta.dirname, 'src') },
			{ find: '@scss', replacement: path.resolve(import.meta.dirname, 'src/scss') },
			...releaseOnlyAliases,
		],
	},
});
