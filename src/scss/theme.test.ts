/**
 * @file Tests for the Palette and the Styles of the theme stylesheet.
 */

import path from 'path';
import { compile } from 'sass';
import { describe, expect, it } from 'vitest';

const css = compile(path.resolve(__dirname, 'theme.scss')).css;

/**
 * Custom properties declared by the first rule with exactly this selector, from the given position of the stylesheet.
 */
function declarations(selector: string, from = 0): Record<string, string> {
	const start = css.indexOf(`${selector} {`, from);
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
		expect(declarations(DEFAULTS)).toMatchObject({
			'--genesys-blue-shade': 'hsl(from var(--genesys-blue) h s calc(l - 10))',
			'--genesys-gold-shade': 'hsl(from var(--genesys-gold) h s calc(l - 0.8))',
		});
	});

	it('falls back to the default shades in browsers without relative colors', () => {
		const fallback = css.indexOf('@supports not (color: hsl(from red h s l))');
		expect(fallback).toBeGreaterThan(css.indexOf(`${DEFAULTS} {`));

		// Sass keeps the fractional channels of an adjusted color: these are #1d334e and #efad5d, to the nearest unit.
		expect(declarations(DEFAULTS, fallback)).toEqual({
			'--genesys-blue-shade': 'rgb(11.4197071234%, 19.9180938198%, 30.5410771904%)',
			'--genesys-gold-shade': 'rgb(93.5783637593%, 67.8918187965%, 36.5863421231%)',
		});
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
