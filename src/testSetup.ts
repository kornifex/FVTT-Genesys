/** @file Vitest setup: a unit test that reaches a Foundry global it didn't stub fails, naming the global. */

// Without this, reaching a missing global throws a bare ReferenceError, or a test's stub of an old global (such as
// `Die`, which v14 removed) hides that the code needs Foundry at all. A test that needs one stubs it with
// `vi.stubGlobal`, which replaces the property defined here.
const FOUNDRY_GLOBALS = [
	'foundry',
	'game',
	'CONFIG',
	'CONST',
	'Hooks',
	'ui',
	'canvas',
	'Die',
	'Roll',
	'ChatMessage',
	'TextEditor',
	'Handlebars',
	'Actor',
	'Item',
	'ActiveEffect',
	'Combat',
	'Token',
	'fromUuid',
	'fromUuidSync',
];

for (const name of FOUNDRY_GLOBALS) {
	Object.defineProperty(globalThis, name, {
		configurable: true,
		get() {
			throw new Error(
				`The Foundry global \`${name}\` was reached in a unit test: keep the module under test free of Foundry, or stub it with \`vi.stubGlobal\`.`,
			);
		},
	});
}
