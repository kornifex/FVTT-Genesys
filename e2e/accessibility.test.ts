import { describe, expect, it } from 'vitest';

import { accessibleName } from './accessibility.ts';

describe('accessibleName', () => {
	it('reads the name of an image, with or without its text after it', () => {
		expect(accessibleName('- img "1 Proficiency die"')).toBe('1 Proficiency die');
		expect(accessibleName('- img "2 Successes, 3 Advantage": ssaaa')).toBe('2 Successes, 3 Advantage');
	});

	it('reads the name of a button', () => {
		expect(accessibleName('- button "Upgrade 1 Ability die"')).toBe('Upgrade 1 Ability die');
		expect(accessibleName(`- 'button "Cancel: Remove 1 Ability die"': A`)).toBe('Cancel: Remove 1 Ability die');
	});

	it('reads a name YAML quotes for its colon, its own quotes escaped', () => {
		expect(accessibleName(`- 'img "Ability Die: Blank face"': A`)).toBe('Ability Die: Blank face');
		expect(accessibleName(`- 'img "Dé d''aptitude : 1 \\"succès\\""'`)).toBe(`Dé d'aptitude : 1 "succès"`);
	});

	it('reads no name for what is neither an image nor a button, or shows nothing', () => {
		expect(accessibleName('- text: "23"')).toBeNull();
		expect(accessibleName('')).toBeNull();
	});
});
