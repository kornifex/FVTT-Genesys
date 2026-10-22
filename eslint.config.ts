import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import vue from 'eslint-plugin-vue';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
	js.configs.recommended,
	tseslint.configs.recommendedTypeChecked,
	vue.configs['flat/essential'],
	{
		files: ['**/*.vue'],
		languageOptions: { parserOptions: { parser: tseslint.parser } },
	},
	{
		languageOptions: {
			parserOptions: {
				projectService: {
					// The build config files belong to tsconfig.node.json, which the project service does not look up by itself.
					allowDefaultProject: ['*.config.ts', 'build/*.ts'],
					defaultProject: 'tsconfig.node.json',
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.vue'],
			},
		},
		rules: {
			// TypeScript checks the globals, Foundry's included, which ESLint does not know.
			'no-undef': 'off',
			// Foundry and the sheets declare async hooks (getVueContext, enrichers) that some overrides fill without awaiting;
			// no-floating-promises and await-thenable catch the mistakes this rule aims at.
			'@typescript-eslint/require-await': 'off',
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
			'vue/no-unused-vars': ['error', { ignorePattern: '^_' }],
			'vue/multi-word-component-names': 'off',
		},
	},
	{
		files: ['src/**'],
		ignores: ['src/log.ts'],
		// src/log.ts prefixes the system's messages.
		rules: { 'no-console': 'error' },
	},
	{
		// A Vue component is its file's default export, which sfc.d.ts declares.
		files: ['src/**/*.ts'],
		ignores: ['src/vue/sfc.d.ts'],
		rules: {
			'no-restricted-syntax': ['error', { selector: 'ExportDefaultDeclaration', message: 'Use a named export.' }],
		},
	},
	prettier,
);
