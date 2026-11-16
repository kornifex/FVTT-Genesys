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
const DARK = ':where(.theme-dark)';
const TERRINOTH_DARK = ':where([data-genesys-style=terrinoth] .theme-dark)';
const LIGHT = ':where(.theme-light)';
const CHAT_LOGS = '.sidebar-tab.theme-dark .chat-log, #interface.theme-dark #chat-notifications .chat-log';
const DARK_CHAT_LOGS = `:where(${CHAT_LOGS})`;
const TERRINOTH_DARK_CHAT_LOGS = `:where(${CHAT_LOGS.split(', ')
	.map((logs) => `[data-genesys-style=terrinoth] ${logs}`)
	.join(', ')})`;

// The colors of each pair of Style and theme, as an element of that pair inherits them.
const PAIRS = [
	['Genesys', 'light', () => declarations(DEFAULTS)],
	['Realms of Terrinoth', 'light', () => ({ ...declarations(DEFAULTS), ...declarations(TERRINOTH) })],
	['Genesys', 'dark', () => ({ ...declarations(DEFAULTS), ...declarations(DARK) })],
	[
		'Realms of Terrinoth',
		'dark',
		() => ({ ...declarations(DEFAULTS), ...declarations(TERRINOTH), ...declarations(DARK), ...declarations(TERRINOTH_DARK) }),
	],
] satisfies [string, string, () => Record<string, string>][];

const DICE = ['ability', 'difficulty', 'proficiency', 'challenge', 'boost', 'setback'];

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

/**
 * The colors Foundry gave its AppV1 windows, which the sheets, the Dice Prompt and the roll cards were drawn with before
 * they joined the Palette (#850).
 */
const APPV1_COLORS = {
	'--genesys-text': '#191813',
	'--genesys-text-muted': '#4b4a44',
	'--genesys-input': 'rgba(0, 0, 0, 0.05)',
	'--genesys-input-border': '#7a7971',
	'--genesys-heading-rule': '#782e22',
};

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
			'--genesys-text-dark-blue': 'var(--genesys-dark-blue)',
			'--genesys-text-red': 'var(--genesys-red)',
			'--genesys-text-gold': 'var(--genesys-gold)',
			'--genesys-text-on-dark': '#fff',
			'--genesys-text-on-light': '#000',
			'--genesys-text-alert': 'color-mix(in srgb, var(--genesys-alert), white 50%)',
			'--genesys-icon-gold': 'color-mix(in srgb, var(--genesys-gold), black 35%)',
			'--genesys-field': '#fff',
			'--genesys-shadow': '#000',
			'--genesys-die-outline': '#000',
		});
	});

	it("outlines each die with the dice's outline, and borders each filled rank box with ink", () => {
		expect(declarations(DEFAULTS)).toMatchObject({
			...Object.fromEntries(DICE.map((die) => [`--genesys-die-outline-${die}`, 'var(--genesys-die-outline)'])),
			'--genesys-skill-rank-border-ability': 'var(--genesys-ink)',
			'--genesys-skill-rank-border-proficiency': 'var(--genesys-ink)',
		});
	});

	it("declares AppV1's colors, which the sheets and prompts were first drawn with", () => {
		expect(declarations(DEFAULTS)).toMatchObject(APPV1_COLORS);
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

	it("keeps AppV1's colors", () => {
		expect({ ...declarations(DEFAULTS), ...declarations(TERRINOTH) }).toMatchObject(APPV1_COLORS);
	});

	it('derives its text blue and text gold from its own blue and gold', () => {
		expect(declarations(TERRINOTH)).toMatchObject({
			'--genesys-text-blue': 'color-mix(in srgb, var(--genesys-blue), black 20%)',
			'--genesys-text-gold': 'color-mix(in srgb, var(--genesys-gold), white 45%)',
		});
	});
});

describe('Dark theme', () => {
	const themed = () => [...new Set([...Object.keys(declarations(DARK)), ...Object.keys(declarations(TERRINOTH_DARK))])];

	it('darkens the paper and lightens the ink', () => {
		expect(declarations(DARK)).toMatchObject({
			'--genesys-paper': '#24211e',
			'--genesys-paper-pattern': '#2c2925',
			'--genesys-ink': '#ebe6de',
			'--genesys-die-outline': '#fff',
		});
	});

	// A world's override of these on `:root` still applies in the dark theme.
	it('keeps the published colors other than the surfaces, and the dice', () => {
		const kept = ['red', 'light-blue', 'blue', 'dark-blue', 'gold', 'orange', 'alert', 'glow-core', 'glow'].concat(
			DICE.map((die) => `die-${die}`),
		);

		for (const name of kept) {
			expect(themed(), name).not.toContain(`--genesys-${name}`);
		}
	});

	it('derives its text blue from the blue of the Style', () => {
		expect(declarations(DARK)['--genesys-text-blue']).toBe('color-mix(in srgb, var(--genesys-blue), white 55%)');
		expect(declarations(TERRINOTH_DARK)['--genesys-text-blue']).toBe('color-mix(in srgb, var(--genesys-blue), white 40%)');
	});

	it('declares the Style after the Genesys dark theme, and the light theme after both', () => {
		const start = (selector: string) => css.indexOf(`${selector} {`);

		expect(start(DARK)).toBeGreaterThan(start(TERRINOTH));
		expect(start(TERRINOTH_DARK)).toBeGreaterThan(start(DARK));
		expect(start(LIGHT)).toBeGreaterThan(start(TERRINOTH_DARK));
	});

	// A sheet forcing the light theme inside Foundry's dark applications takes back the colors the document root computed,
	// with the Style and a world's override on `:root`.
	it('lets a light element inside a dark one take back the light colors of the document root', () => {
		const names = themed().map((property) => property.slice('--genesys-'.length));

		expect(declarations(LIGHT)).toEqual(
			Object.fromEntries(names.map((name) => [`--genesys-${name}`, `var(--genesys-theme-light-${name})`])),
		);
		expect(declarations(DEFAULTS)).toMatchObject(
			Object.fromEntries(names.map((name) => [`--genesys-theme-light-${name}`, `var(--genesys-${name})`])),
		);
	});

	// Foundry marks each chat log `theme-light`, whatever the interface's theme.
	it('gives the dark variant back to the chat log of a dark interface, after the light theme', () => {
		const start = (selector: string) => css.indexOf(`${selector} {`);

		expect(declarations(DARK_CHAT_LOGS)).toEqual(declarations(DARK));
		expect(declarations(TERRINOTH_DARK_CHAT_LOGS)).toEqual(declarations(TERRINOTH_DARK));
		expect(start(DARK_CHAT_LOGS)).toBeGreaterThan(start(LIGHT));
		expect(start(TERRINOTH_DARK_CHAT_LOGS)).toBeGreaterThan(start(DARK_CHAT_LOGS));
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
	'text-dark-blue': ['paper', 'paper-pattern', 'field'],
	'text-red': ['paper', 'paper-pattern', 'field'],
	'text-gold': ['dark-blue'],
	'text-on-dark': ['blue', 'dark-blue', 'red', 'blue-shade'],
	'text-alert': ['dark-blue'],
	text: ['paper', 'paper-pattern', 'field'],
	'text-muted': ['paper', 'paper-pattern'],
} satisfies Record<string, string[]>;

// Each color for icons, and the backgrounds it is drawn on.
const ICON_ON = {
	'icon-gold': ['paper', 'paper-pattern'],
	// The outline sets each die's glyph apart from the paper, whatever the die's own color.
	'die-outline': ['paper', 'paper-pattern'],
	// The symbols on a rolled die's face.
	'text-on-light': ['die-ability', 'die-proficiency', 'die-boost'],
	'text-on-dark': ['die-difficulty', 'die-challenge', 'die-setback'],
} satisfies Record<string, string[]>;

// Each outline and border of the dark theme, and the color it surrounds (#865).
const OUTLINE_AROUND = {
	...Object.fromEntries(DICE.map((die) => [`die-outline-${die}`, `die-${die}`])),
	'skill-rank-border-ability': 'die-ability',
	'skill-rank-border-proficiency': 'skill-rank-proficiency',
};

// Text drawn on a translucent tint of the Palette: the tint, its opacity, and what it lies over.
const TEXT_ON_TINT = [
	// A Container's contents row, at rest and hovered, shows its quantity and weight in ink.
	{ text: 'ink', tint: 'blue', opacity: 0.2, over: 'paper-pattern' },
	{ text: 'ink', tint: 'blue', opacity: 0.4, over: 'paper-pattern' },
];

// Text drawn on a translucent color of the Palette, and what that color lies over.
const TEXT_ON_TRANSLUCENT = [
	// A text field or a select of a sheet or a prompt.
	{ text: 'text', translucent: 'input', over: 'paper' },
	{ text: 'text', translucent: 'input', over: 'paper-pattern' },
	{ text: 'text', translucent: 'input', over: 'field' },
];

/**
 * A translucent color over another, as the browser composites them.
 */
function composite(color: Rgb, opacity: number, background: Rgb): Rgb {
	return color.map((channel, index) => channel * opacity + background[index] * (1 - opacity)) as Rgb;
}

/**
 * A translucent Palette color, declared as `rgba()`, over another color of the Palette.
 */
function resolveOver(name: string, over: string, style: Record<string, string>): Rgb {
	const value = style[`--genesys-${name}`];
	const rgba = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(value);
	expect(rgba, `${name}: ${value}`).not.toBeNull();

	const [, red, green, blue, opacity] = rgba!.map(Number);
	return composite([red, green, blue], opacity, resolve(over, style));
}

describe.each(PAIRS)('Text in the %s Style and the %s theme', (_, _theme, style) => {
	it.each(Object.entries(TEXT_ON).flatMap(([text, backgrounds]) => backgrounds.map((background) => [text, background])))(
		'draws %s on %s at 4.5:1 or more',
		(text, background) => {
			expect(contrast(resolve(text, style()), resolve(background, style()))).toBeGreaterThanOrEqual(4.5);
		},
	);

	it.each(TEXT_ON_TINT)('draws $text on $tint at $opacity over $over at 4.5:1 or more', ({ text, tint, opacity, over }) => {
		const background = composite(resolve(tint, style()), opacity, resolve(over, style()));
		expect(contrast(resolve(text, style()), background)).toBeGreaterThanOrEqual(4.5);
	});

	it.each(TEXT_ON_TRANSLUCENT)('draws $text on $translucent over $over at 4.5:1 or more', ({ text, translucent, over }) => {
		expect(contrast(resolve(text, style()), resolveOver(translucent, over, style()))).toBeGreaterThanOrEqual(4.5);
	});

	it.each(Object.entries(ICON_ON).flatMap(([icon, backgrounds]) => backgrounds.map((background) => [icon, background])))(
		'draws the %s icons on %s at 3:1 or more',
		(icon, background) => {
			expect(contrast(resolve(icon, style()), resolve(background, style()))).toBeGreaterThanOrEqual(3);
		},
	);
});

// In the light theme, the dark outline sets the light dice apart from the paper, and the dark dice stand out from it
// themselves.
describe.each(PAIRS.filter(([, theme]) => theme === 'dark'))('Outlines in the %s Style and the %s theme', (_, _theme, style) => {
	it.each(Object.entries(OUTLINE_AROUND))('draws %s around %s at 3:1 or more', (outline, color) => {
		expect(contrast(resolve(outline, style()), resolve(color, style()))).toBeGreaterThanOrEqual(3);
	});

	// A world's override of a die's color on `:root` reaches its outline.
	it.each(Object.entries(OUTLINE_AROUND))('derives %s from %s or from the light outline', (outline, color) => {
		expect([`color-mix(in srgb, var(--genesys-${color}), black 65%)`, 'var(--genesys-die-outline)']).toContain(
			style()[`--genesys-${outline}`],
		);
	});
});
