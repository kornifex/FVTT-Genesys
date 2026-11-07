/**
 * @file Checks that the styles draw with the Palette: no color literal outside the files that define colors.
 */

import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve(__dirname, '..');

// `vars/colors.scss` defines the Palette; `vars/appv1.scss` copies Foundry's AppV1 colors, which follow Foundry.
const COLOR_FILES = ['scss/vars/colors.scss', 'scss/vars/appv1.scss'];

// The CSS named colors (CSS Color 4), without the keywords that name no color, such as `transparent` or `currentColor`.
const NAMED_COLORS = [
	'aliceblue',
	'antiquewhite',
	'aqua',
	'aquamarine',
	'azure',
	'beige',
	'bisque',
	'black',
	'blanchedalmond',
	'blue',
	'blueviolet',
	'brown',
	'burlywood',
	'cadetblue',
	'chartreuse',
	'chocolate',
	'coral',
	'cornflowerblue',
	'cornsilk',
	'crimson',
	'cyan',
	'darkblue',
	'darkcyan',
	'darkgoldenrod',
	'darkgray',
	'darkgreen',
	'darkgrey',
	'darkkhaki',
	'darkmagenta',
	'darkolivegreen',
	'darkorange',
	'darkorchid',
	'darkred',
	'darksalmon',
	'darkseagreen',
	'darkslateblue',
	'darkslategray',
	'darkslategrey',
	'darkturquoise',
	'darkviolet',
	'deeppink',
	'deepskyblue',
	'dimgray',
	'dimgrey',
	'dodgerblue',
	'firebrick',
	'floralwhite',
	'forestgreen',
	'fuchsia',
	'gainsboro',
	'ghostwhite',
	'gold',
	'goldenrod',
	'gray',
	'green',
	'greenyellow',
	'grey',
	'honeydew',
	'hotpink',
	'indianred',
	'indigo',
	'ivory',
	'khaki',
	'lavender',
	'lavenderblush',
	'lawngreen',
	'lemonchiffon',
	'lightblue',
	'lightcoral',
	'lightcyan',
	'lightgoldenrodyellow',
	'lightgray',
	'lightgreen',
	'lightgrey',
	'lightpink',
	'lightsalmon',
	'lightseagreen',
	'lightskyblue',
	'lightslategray',
	'lightslategrey',
	'lightsteelblue',
	'lightyellow',
	'lime',
	'limegreen',
	'linen',
	'magenta',
	'maroon',
	'mediumaquamarine',
	'mediumblue',
	'mediumorchid',
	'mediumpurple',
	'mediumseagreen',
	'mediumslateblue',
	'mediumspringgreen',
	'mediumturquoise',
	'mediumvioletred',
	'midnightblue',
	'mintcream',
	'mistyrose',
	'moccasin',
	'navajowhite',
	'navy',
	'oldlace',
	'olive',
	'olivedrab',
	'orange',
	'orangered',
	'orchid',
	'palegoldenrod',
	'palegreen',
	'paleturquoise',
	'palevioletred',
	'papayawhip',
	'peachpuff',
	'peru',
	'pink',
	'plum',
	'powderblue',
	'purple',
	'rebeccapurple',
	'red',
	'rosybrown',
	'royalblue',
	'saddlebrown',
	'salmon',
	'sandybrown',
	'seagreen',
	'seashell',
	'sienna',
	'silver',
	'skyblue',
	'slateblue',
	'slategray',
	'slategrey',
	'snow',
	'springgreen',
	'steelblue',
	'tan',
	'teal',
	'thistle',
	'tomato',
	'turquoise',
	'violet',
	'wheat',
	'white',
	'whitesmoke',
	'yellow',
	'yellowgreen',
];

const LITERAL = new RegExp(
	[
		'#[0-9a-f]{3,8}\\b',
		'\\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\\(',
		// A name, not part of a longer identifier, a variable, a class or an id.
		`(?<![\\w$.#-])(?:${NAMED_COLORS.join('|')})(?![\\w-])`,
	].join('|'),
	'gi',
);

function files(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const file = path.join(directory, entry.name);
		return entry.isDirectory() ? files(file) : [file];
	});
}

/**
 * The style sheet of a file, with its comments and strings blanked, so that line numbers still match: a whole SCSS file,
 * or the `<style>` blocks of a Vue component.
 */
function styles(file: string): string {
	const source = readFileSync(file, 'utf8');
	const sheet = file.endsWith('.vue')
		? source.replace(
				/<style[^>]*>([\s\S]*?)<\/style>|[^\n]/g,
				(match, style: string | undefined) => style ?? (match === '\n' ? '\n' : ' '),
			)
		: source;
	const blank = (match: string) => match.replace(/[^\n]/g, ' ');
	return sheet.replace(/\/\*[\s\S]*?\*\/|(?<![:\w])\/\/[^\n]*|'[^'\n]*'|"[^"\n]*"/g, blank);
}

/**
 * Every color literal of the styles under `src/`, as `file:line literal`.
 */
function colorLiterals(): string[] {
	return files(SRC)
		.filter((file) => /\.(s?css|vue)$/.test(file) && !COLOR_FILES.includes(path.relative(SRC, file)))
		.flatMap((file) =>
			styles(file)
				.split('\n')
				.flatMap((line, index) =>
					[...line.matchAll(LITERAL)].map(([literal]) => `${path.relative(SRC, file)}:${index + 1} ${literal}`),
				),
		);
}

describe('styles', () => {
	it('draw with the Palette, without color literals', () => {
		// Joined, so that a failure lists every literal instead of the first few.
		expect(colorLiterals().join('\n')).toBe('');
	});
});
