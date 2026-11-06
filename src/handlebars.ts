import { dieOfDenomination } from '@/dice/DieTypes';
import { dieResultLabel, glyphAttributesHTML, glyphLabelAttributesHTML, worldGlyphLocalizer } from '@/dice/GenesysPoolModifications';

/**
 * Register the Handlebars helpers the system's templates use.
 */
export function register() {
	Handlebars.registerHelper('capitalize', (value: string) => value.capitalize());
	Handlebars.registerHelper('toLowerCase', (value: string) => value.toLowerCase());
	Handlebars.registerHelper('toUpperCase', (value: string) => value.toUpperCase());
	Handlebars.registerHelper('split', (value: string) => value.split(' '));
	Handlebars.registerHelper('isSubstringOf', (substring: string, fullString: string) => fullString.includes(substring));

	Handlebars.registerHelper('add', (lhs: number, rhs: number) => lhs + rhs);
	Handlebars.registerHelper('sub', (lhs: number, rhs: number) => lhs - rhs);
	Handlebars.registerHelper('mul', (lhs: number, rhs: number) => lhs * rhs);
	Handlebars.registerHelper('div', (lhs: number, rhs: number) => lhs / rhs);
	Handlebars.registerHelper('min', (lhs: number, rhs: number) => Math.min(lhs, rhs));
	Handlebars.registerHelper('max', (lhs: number, rhs: number) => Math.max(lhs, rhs));
	Handlebars.registerHelper('abs', (val: number) => Math.abs(val));
	Handlebars.registerHelper('floor', (val: number) => Math.floor(val));
	Handlebars.registerHelper('toFixed', (val: number, fractionDigits: number) => val.toFixed(fractionDigits));

	Handlebars.registerHelper('and', (lhs: boolean, rhs: boolean) => lhs && rhs);
	Handlebars.registerHelper('or', (lhs: boolean, rhs: boolean) => lhs || rhs);
	Handlebars.registerHelper('not', (val: boolean) => !val);

	Handlebars.registerHelper('repeat', (times: number, options: { fn: (time: number) => string | number }) => {
		const results = [];

		for (let i = 0; i < times; i++) {
			results.push(options.fn(i));
		}

		return results.join('');
	});

	// The attributes that label an element holding glyphs in words: `{{glyphAttributes 'ssa'}}`, or a die's result by its
	// denomination, `{{glyphAttributes face die='a'}}`. Without glyphs, as a value the context lacks, none: Handlebars then
	// passes its options alone.
	Handlebars.registerHelper('glyphAttributes', (...args: unknown[]) => {
		const options = args.pop() as { hash: { die?: string } };
		const [glyphs] = args;
		const text = Array.isArray(glyphs) ? glyphs.join('') : typeof glyphs === 'string' ? glyphs : '';
		const die = options.hash.die ? dieOfDenomination(options.hash.die) : undefined;
		return new Handlebars.SafeString(
			die ? glyphAttributesHTML(dieResultLabel(die, text, worldGlyphLocalizer())) : glyphLabelAttributesHTML(text),
		);
	});
}
