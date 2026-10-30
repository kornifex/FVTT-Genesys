import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import vue from 'eslint-plugin-vue';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const noEnum = { selector: 'TSEnumDeclaration', message: 'Use an as-const object and the union of its values.' };

// The globals Foundry deprecated, each with the namespaced class v13 and v14 both have: v14 removed `Die`, and v15 removes
// the others. fvtt-types still declares the others, marked deprecated, so the compiler takes them (ADR 0006); this rule
// rejects them and names the replacement.
//
// v13: v14 also deprecates the roll modes, whose replacements v13 lacks, so they stay until v13 leaves support:
// `game.settings.get('core', 'rollMode')` (GenesysCombat.ts, CheckRoll.ts), `ChatMessage.applyRollMode` (→ `applyMode`),
// `CONST.DICE_ROLL_MODES`, and the `rollMode` option of `ChatMessage.create`.
const deprecatedGlobals = Object.entries({
	Die: 'foundry.dice.terms.Die',
	getTemplate: 'foundry.applications.handlebars.getTemplate',
	loadTemplates: 'foundry.applications.handlebars.loadTemplates',
	renderTemplate: 'foundry.applications.handlebars.renderTemplate',
	TextEditor: 'foundry.applications.ux.TextEditor.implementation',
	Tabs: 'foundry.applications.ux.Tabs',
	FilePicker: 'foundry.applications.apps.FilePicker.implementation',
	DocumentSheetConfig: 'foundry.applications.apps.DocumentSheetConfig',
	ActiveEffectConfig: 'foundry.applications.sheets.ActiveEffectConfig',
	Dialog: 'foundry.applications.api.DialogV2, or foundry.appv1.api.Dialog until v16',
	Actors: 'foundry.documents.collections.Actors',
	Items: 'foundry.documents.collections.Items',
	ActorSheet: 'foundry.appv1.sheets.ActorSheet',
	ItemSheet: 'foundry.appv1.sheets.ItemSheet',
	ActorDirectory: 'foundry.applications.sidebar.tabs.ActorDirectory',
	ItemDirectory: 'foundry.applications.sidebar.tabs.ItemDirectory',
	Compendium: 'foundry.applications.sidebar.apps.Compendium',
}).map(([name, replacement]) => ({ name, message: `Foundry deprecated this global: use ${replacement}.` }));
// Reaching one through the global object is the same use, which no-restricted-globals doesn't see.
const deprecatedGlobalProperties = deprecatedGlobals.flatMap(({ name, message }) =>
	['globalThis', 'window', 'self'].map((object) => ({ object, property: name, message })),
);

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
				projectService: true,
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
		// The build files belong to tsconfig.node.json, which the project service does not look up by itself.
		files: ['*.config.ts', 'build/**/*.ts'],
		languageOptions: { parserOptions: { projectService: false, project: 'tsconfig.node.json' } },
	},
	{
		// The functions the e2e harness runs in the page use Foundry's globals untyped (e2e/foundry.d.ts).
		files: ['e2e/page.ts', 'e2e/scenario.ts', 'e2e/scenarios/**/*.ts'],
		rules: {
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
		},
	},
	{
		files: ['src/**'],
		ignores: ['src/log.ts'],
		// src/log.ts prefixes the system's messages.
		rules: { 'no-console': 'error' },
	},
	{
		// The e2e harness runs its page helpers and the functions its scenarios evaluate in the Foundry page too.
		files: ['src/**', 'e2e/**'],
		rules: {
			'no-restricted-globals': ['error', ...deprecatedGlobals],
			'no-restricted-properties': ['error', ...deprecatedGlobalProperties],
		},
	},
	{
		// A declaration file may need an interface, to merge into one of Foundry's.
		files: ['src/**/*.ts', 'src/**/*.vue'],
		ignores: ['src/**/*.d.ts'],
		rules: {
			'@typescript-eslint/consistent-type-definitions': ['error', 'type'],
			'no-restricted-syntax': ['error', noEnum],
		},
	},
	{
		// A Vue component is its file's default export, which sfc.d.ts declares.
		files: ['src/**/*.ts'],
		ignores: ['src/vue/sfc.d.ts'],
		rules: {
			'no-restricted-syntax': ['error', noEnum, { selector: 'ExportDefaultDeclaration', message: 'Use a named export.' }],
		},
	},
	prettier,
);
