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

type Rgb = [number, number, number];

function rgb(hex: string): Rgb {
	return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)) as Rgb;
}

/**
 * The shade of a Palette color as a browser computes it, from the color the Style gives: its `color-mix()` with black,
 * whose percentage is black's share.
 */
function shade(name: string, style: Record<string, string>): Rgb {
	const mix = /^color-mix\(in srgb, var\(--genesys-([a-z-]+)\), black ([\d.]+)%\)$/.exec(
		declarations(DEFAULTS)[`--genesys-${name}-shade`],
	);
	expect(mix, `${name} shade`).not.toBeNull();

	const [, base, blackPercent] = mix!;
	return rgb(style[`--genesys-${base}`]).map((channel) => channel * (1 - Number(blackPercent) / 100)) as Rgb;
}

/**
 * The shades the browser computed with relative colors, before #99, as its Evidence measured them in Chromium 153.
 */
const RELATIVE_COLOR_SHADES = {
	blue: [29.1, 50.8, 77.9],
	gold: [238.6, 173.1, 93.3],
	terrinothBlue: [147, 68, 37],
} satisfies Record<string, Rgb>;

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

	it('keeps the default blue and gold shades within 3 units per channel of the relative colors they replace', () => {
		const defaults = declarations(DEFAULTS);

		for (const name of ['blue', 'gold'] as const) {
			shade(name, defaults).forEach((channel, index) =>
				expect(Math.abs(channel - RELATIVE_COLOR_SHADES[name][index]), name).toBeLessThanOrEqual(3),
			);
		}
	});

	it('colors the PC and NPC Initiative Slots', () => {
		expect(declarations(DEFAULTS)).toMatchObject({
			'--genesys-initiative-slot-pc': '#155786',
			'--genesys-initiative-slot-npc': '#923414',
		});
	});

	it('declares the colors that name a role', () => {
		expect(declarations(DEFAULTS)).toMatchObject({
			'--genesys-ink': '#000',
			'--genesys-ink-muted': 'color-mix(in srgb, var(--genesys-blue-gray), black 15%)',
			'--genesys-text-blue': 'var(--genesys-blue)',
			'--genesys-text-gold': 'var(--genesys-gold)',
			'--genesys-text-on-dark': '#fff',
			'--genesys-text-alert': 'color-mix(in srgb, var(--genesys-alert), white 50%)',
			'--genesys-field': '#fff',
			'--genesys-shadow': '#000',
			'--genesys-die-outline': '#000',
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

	it('darkens its blue shade in proportion, to rgb(128, 59, 32) instead of the relative color rgb(147, 68, 37)', () => {
		const blueShade = shade('blue', { ...declarations(DEFAULTS), ...declarations(TERRINOTH) });

		expect(blueShade.map(Math.round)).toEqual([128, 59, 32]);
		blueShade.forEach((channel, index) => expect(channel).toBeLessThan(RELATIVE_COLOR_SHADES.terrinothBlue[index]));
	});

	it('colors the Initiative Slots with its blue and red', () => {
		expect(declarations(TERRINOTH)).toMatchObject({
			'--genesys-initiative-slot-pc': 'var(--genesys-blue)',
			'--genesys-initiative-slot-npc': 'var(--genesys-red)',
		});
	});

	it('derives its text blue and text gold from its own blue and gold', () => {
		expect(declarations(TERRINOTH)).toMatchObject({
			'--genesys-text-blue': 'color-mix(in srgb, var(--genesys-blue), black 20%)',
			'--genesys-text-gold': 'color-mix(in srgb, var(--genesys-gold), white 45%)',
		});
	});
});

/**
 * A Palette color as a browser computes it in a Style: a hex color, another color of the Palette, or a `color-mix()` of
 * one with black or white, whose percentage is black's or white's share.
 */
function resolve(name: string, style: Record<string, string>): Rgb {
	const value = style[`--genesys-${name}`];
	expect(value, name).toBeDefined();

	const reference = /^var\(--genesys-([a-z-]+)\)$/.exec(value);
	if (reference) {
		return resolve(reference[1], style);
	}

	const mix = /^color-mix\(in srgb, var\(--genesys-([a-z-]+)\), (black|white) ([\d.]+)%\)$/.exec(value);
	if (mix) {
		const [, base, other, percent] = mix;
		const share = Number(percent) / 100;
		const target = other === 'white' ? 255 : 0;
		return resolve(base, style).map((channel) => channel * (1 - share) + target * share) as Rgb;
	}

	const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
	expect(hex, `${name}: ${value}`).not.toBeNull();
	const digits = hex![1].length === 3 ? [...hex![1]].map((digit) => digit + digit).join('') : hex![1];
	return rgb(`#${digits}`);
}

/**
 * The contrast ratio of two colors, as WCAG 2.2 defines it.
 */
function contrast(a: Rgb, b: Rgb): number {
	const luminance = (color: Rgb) => {
		const [red, green, blue] = color.map((channel) => {
			const value = channel / 255;
			return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
		});
		return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
	};
	const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (lighter + 0.05) / (darker + 0.05);
}

// Each color for text, and the backgrounds it is drawn on.
const TEXT_ON = {
	ink: ['paper', 'paper-pattern', 'field'],
	'ink-muted': ['paper', 'paper-pattern', 'field'],
	'text-blue': ['paper', 'paper-pattern', 'field'],
	'text-gold': ['dark-blue'],
	'text-on-dark': ['blue', 'dark-blue', 'red', 'blue-shade'],
	'text-alert': ['dark-blue'],
} satisfies Record<string, string[]>;

describe.each([
	['Genesys', () => declarations(DEFAULTS)],
	['Realms of Terrinoth', () => ({ ...declarations(DEFAULTS), ...declarations(TERRINOTH) })],
])('Text in the %s Style', (_, style) => {
	it.each(Object.entries(TEXT_ON).flatMap(([text, backgrounds]) => backgrounds.map((background) => [text, background])))(
		'draws %s on %s at 4.5:1 or more',
		(text, background) => {
			expect(contrast(resolve(text, style()), resolve(background, style()))).toBeGreaterThanOrEqual(4.5);
		},
	);
});
