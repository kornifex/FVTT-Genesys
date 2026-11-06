/** @file Tests for the Handlebars helpers the system's templates use. */

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { register } from '@/handlebars';

describe('glyphAttributes', () => {
	let Handlebars: typeof import('handlebars');

	beforeAll(async () => {
		// The package reads the global `Handlebars` as it loads, which the unit tests keep from Foundry until stubbed.
		vi.stubGlobal('Handlebars', undefined);
		Handlebars = (await import('handlebars')).default.create();
		vi.stubGlobal('Handlebars', Handlebars);
		// Each label as its key and its data, so that the test reads what it names.
		vi.stubGlobal('game', {
			i18n: {
				lang: 'en',
				localize: (key: string) => key.split('.').pop(),
				format: (key: string, data: Record<string, string>) =>
					`${key.split('.').slice(-2).join('.')} ${Object.values(data).join(' ')}`,
				getListFormatter: (options: Intl.ListFormatOptions) => new Intl.ListFormat('en', options),
			},
		});
		register();
	});

	const render = (template: string, context: object = {}) => Handlebars.compile(template)(context);

	it('labels the glyphs of a text or a list as an image, its tooltip taken from the label', () => {
		expect(render('<i {{glyphAttributes glyphs}}>', { glyphs: 's' })).toBe('<i role="img" aria-label="Success.one 1" data-tooltip="">');
		expect(render('<i {{glyphAttributes glyphs}}>', { glyphs: ['s', 's'] })).toBe(
			'<i role="img" aria-label="Success.other 2" data-tooltip="">',
		);
	});

	it("labels a die's result by its denomination", () => {
		expect(render(`<i {{glyphAttributes face die='i'}}>`, { face: 'h' })).toBe(
			'<i role="img" aria-label="Glyphs.DieResult Difficulty Threat.one 1" data-tooltip="">',
		);
	});

	it('gives no attribute without glyphs, as a value the context lacks', () => {
		expect(render('<i {{glyphAttributes}}>')).toBe('<i >');
		expect(render('<i {{glyphAttributes missing}}>')).toBe('<i >');
	});
});
