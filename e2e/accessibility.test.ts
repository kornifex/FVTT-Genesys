import { describe, expect, it } from 'vitest';

import { imageName } from './accessibility.ts';

describe('imageName', () => {
	it('reads the name of an image, with or without its text after it', () => {
		expect(imageName('- img "1 Proficiency die"')).toBe('1 Proficiency die');
		expect(imageName('- img "2 Successes, 3 Advantage": ssaaa')).toBe('2 Successes, 3 Advantage');
	});

	it('reads a name YAML quotes for its colon, its own quotes escaped', () => {
		expect(imageName(`- 'img "Ability Die: Blank face"': A`)).toBe('Ability Die: Blank face');
		expect(imageName(`- 'img "Dé d''aptitude : 1 \\"succès\\""'`)).toBe(`Dé d'aptitude : 1 "succès"`);
	});

	it('reads no name for what is no image, or shows nothing', () => {
		expect(imageName('- text: "23"')).toBeNull();
		expect(imageName('')).toBeNull();
	});
});
