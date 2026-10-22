/**
 * @file The effect a sheet's Effects tab creates in each of its categories.
 */

/**
 * A category of the Effects tab, in which the tab adds an effect.
 */
export type EffectCategory = 'temporary' | 'passive' | 'suppressed';

/**
 * The data of the effect added in a category of a document's Effects tab, named after the document.
 */
export function newEffectData(documentName: string, category: EffectCategory) {
	return {
		name: documentName,
		img: 'icons/svg/aura.svg',
		disabled: category === 'suppressed',
		duration: category === 'temporary' ? { rounds: 1 } : undefined,
	};
}
