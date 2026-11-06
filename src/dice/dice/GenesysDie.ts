/**
 * @file Root type of all the custom Die types in the Genesys system.
 */

import type { InexactPartial } from 'fvtt-types/utils';
import { glyphLabelAttributesHTML } from '@/dice/GenesysPoolModifications';

export type DieCategory = 'positive' | 'negative';

/**
 * Base type of all custom Genesys dice.
 */
export abstract class GenesysDie extends foundry.dice.terms.Die {
	/**
	 * The text glyph used to symbolize this die.
	 */
	static readonly GLYPH: string = '';

	/**
	 * The format used when adding this die to a roll.
	 */
	static readonly FORMULA: `d${string}` = 'd';

	/**
	 * The category to which the die belongs.
	 */
	static readonly CATEGORY: DieCategory = 'positive';

	/**
	 * The color glyph used to symbolize this die.
	 */
	static readonly COLOR: string = '';

	/**
	 * Faces of this die type.
	 */
	static readonly FACES: string[] = [];

	/**
	 * Utility method for accessing the class's static denomination from the child.
	 */
	override get denomination() {
		return (this.constructor as typeof GenesysDie).DENOMINATION;
	}

	constructor(termData: InexactPartial<foundry.dice.terms.Die.TermData>) {
		super({ ...termData, faces: 1 });

		this.faces = (this.constructor as typeof GenesysDie).FACES.length;
	}

	/**
	 * Result display should always use the symbol font class.
	 */
	override getResultCSS(_: foundry.dice.terms.DiceTerm.Result): (string | null)[] {
		return ['font-genesys-symbols'];
	}

	/**
	 * The glyphs of the face a result landed on, from the die class's specified faces.
	 */
	resultFace(result: foundry.dice.terms.DiceTerm.Result): string {
		const FACES = (this.constructor as typeof GenesysDie).FACES;

		return FACES[result.result - 1] ?? 'unknown';
	}

	/**
	 * The face of a result, labelled in words. Foundry writes it in a roll's tooltip as HTML.
	 */
	override getResultLabel(result: foundry.dice.terms.DiceTerm.Result): string {
		const face = this.resultFace(result);
		const attributes = glyphLabelAttributesHTML(face);

		return attributes ? `<span ${attributes}>${face}</span>` : face;
	}
}
