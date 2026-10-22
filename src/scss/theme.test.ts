/**
 * @file Tests for the Palette and the Styles of the theme stylesheet.
 */

import path from 'path';
import { pathToFileURL } from 'url';
import { compile } from 'sass';
import { describe, expect, it } from 'vitest';

// Resolves the `@scss/` alias that Vite gives the stylesheets.
const scssAlias = {
	findFileUrl: (url: string) => (url.startsWith('@scss/') ? pathToFileURL(path.resolve(__dirname, url.slice('@scss/'.length))) : null),
};
const css = compile(path.resolve(__dirname, 'theme.scss'), { importers: [scssAlias] }).css;

/**
 * Custom properties declared by the first rule with exactly this selector.
 */
function declarations(selector: string): Record<string, string> {
	const start = css.indexOf(`${selector} {`);
	expect(start, `rule ${selector}`).toBeGreaterThanOrEqual(0);

	const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
	return Object.fromEntries(
		body
			.split(';')
			.map((declaration) => declaration.trim())
			.filter((declaration) => declaration.startsWith('--'))
			.map((declaration) => {
				const separator = declaration.indexOf(':');
				return [declaration.slice(0, separator), declaration.slice(separator + 1).trim()];
			}),
	);
}

const DEFAULTS = ':where(:root)';
const TERRINOTH = ':where(:root[data-genesys-style=terrinoth])';

describe('Palette', () => {
	// Worlds and modules override these since 0.3.0, so none of them may be renamed or removed.
	it('keeps every color published in 0.3.0', () => {
		const published = [
			'red',
			'light-blue',
			'blue',
			'blue-shade',
			'dark-blue',
			'gold',
			'gold-shade',
			'orange',
			'paper',
			'paper-pattern',
			'gray',
			'blue-gray',
			'hint',
			'alert',
			'glow-core',
			'glow',
			'skill-rank-proficiency',
			'die-ability',
			'die-difficulty',
			'die-proficiency',
			'die-challenge',
			'die-boost',
			'die-setback',
		];

		expect(Object.keys(declarations(DEFAULTS))).toEqual(expect.arrayContaining(published.map((name) => `--genesys-${name}`)));
	});

	it('declares its default colors with zero specificity', () => {
		expect(declarations(DEFAULTS)).toMatchObject({
			'--genesys-blue': '#2b4b73',
			'--genesys-red': '#90231e',
		});
	});

	it('derives the shades from the current blue and gold', () => {
		// Mixed with black, these are #1d334e and #ecad60 for the default blue and gold.
		expect(declarations(DEFAULTS)).toMatchObject({
			'--genesys-blue-shade': 'color-mix(in srgb, var(--genesys-blue), black 32%)',
			'--genesys-gold-shade': 'color-mix(in srgb, var(--genesys-gold), black 1.2%)',
		});
	});

	// Chromium 122 (the Foundry v12 desktop app) reads relative colors with the older spec, where they come out black.
	it('uses no relative color syntax', () => {
		expect(css).not.toMatch(/\(\s*from\s/);
	});

	it('colors the PC and NPC Initiative Slots', () => {
		expect(declarations(DEFAULTS)).toMatchObject({
			'--genesys-initiative-slot-pc': '#155786',
			'--genesys-initiative-slot-npc': '#923414',
		});
	});

	it('lets a Style override its default colors', () => {
		expect(css.indexOf(`${TERRINOTH} {`)).toBeGreaterThan(css.indexOf(`${DEFAULTS} {`));
	});
});

describe('Realms of Terrinoth Style', () => {
	it('overrides the Palette with the Realms of Terrinoth colors', () => {
		expect(declarations(TERRINOTH)).toMatchObject({
			'--genesys-blue': '#bc572f',
			'--genesys-red': '#56391b',
			'--genesys-gold': '#9f9080',
			'--genesys-dark-blue': '#57391b',
			'--genesys-light-blue': '#d9c38b',
		});
	});

	it('colors the Initiative Slots with its blue and red', () => {
		expect(declarations(TERRINOTH)).toMatchObject({
			'--genesys-initiative-slot-pc': 'var(--genesys-blue)',
			'--genesys-initiative-slot-npc': 'var(--genesys-red)',
		});
	});
});
