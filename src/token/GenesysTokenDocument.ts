/**
 * An attribute a data model offers a token: a bar with its maximum, or a value.
 */
export type TokenAttributeDetails =
	| {
			/** The localization key of the attribute's name. */
			label: string;
			isBar: true;
			editable: boolean;
			valuePath: string;
			maxPath: string;
			/** A change on the bar stops at twice its maximum, as a character's wounds do (CRB p. 113). */
			cappedAtTwiceMax?: boolean;
	  }
	| {
			/** The localization key of the attribute's name. */
			label: string;
			isBar: false;
			editable: boolean;
			valuePath: string;
	  };

/**
 * A data model class that lists its token attributes, by attribute key.
 */
export type DataModelWithTokenAttributes = { tokenAttributes?: Record<string, TokenAttributeDetails> };

type TrackedAttributes = TokenDocument.TrackedAttributesDescription & {
	source?: Record<string, TokenAttributeDetails>;
};

/**
 * A token, whose bars and attributes come from its actor's data model.
 */
export class GenesysTokenDocument extends TokenDocument {
	override getBarAttribute(barName: string, options: TokenDocument.GetBarAttributeOptions = {}): TokenDocument.GetBarAttributeReturn {
		// Foundry reads the bar by its name, which the types only declare as `bar1` and `bar2`.
		const attribute =
			options.alternative || (this as unknown as Record<string, { attribute?: string } | undefined>)[barName]?.attribute;
		if (!this.actor || !attribute) {
			return null;
		}

		const tokenAttributes = (this.actor.system.constructor as DataModelWithTokenAttributes).tokenAttributes;
		if (!tokenAttributes) {
			return super.getBarAttribute(barName, options);
		}

		const system = this.actor.system;
		const targetAttribute = tokenAttributes[attribute] as TokenAttributeDetails | undefined;
		if (!targetAttribute) {
			return null;
		}

		const dataValue = foundry.utils.getProperty(system, targetAttribute.valuePath);
		if (!Number.isNumeric(dataValue)) {
			return null;
		}

		const value = Number(dataValue);
		if (!targetAttribute.isBar) {
			return { type: 'value', attribute, editable: targetAttribute.editable, value };
		}

		const dataMax = foundry.utils.getProperty(system, targetAttribute.maxPath);
		if (!Number.isNumeric(dataMax)) {
			return null;
		}

		return { type: 'bar', attribute, editable: targetAttribute.editable, value, max: Number(dataMax) };
	}

	static override getTrackedAttributes(data?: TokenDocument.TrackedAttributesSubject, _path?: string[]): TrackedAttributes {
		if (data instanceof foundry.abstract.DataModel) {
			const tokenAttributes = (data.constructor as DataModelWithTokenAttributes).tokenAttributes;
			if (tokenAttributes) {
				return {
					bar: [],
					value: [],
					source: tokenAttributes,
				};
			}
		}

		return super.getTrackedAttributes(data, _path);
	}

	static override getTrackedAttributeChoices(attributes: TrackedAttributes): TokenDocument.TrackedAttributesChoice[] {
		attributes = attributes || this.getTrackedAttributes();
		const barGroup = game.i18n.localize('TOKEN.BarAttributes');
		const valueGroup = game.i18n.localize('TOKEN.BarValues');

		if (attributes.source) {
			const trackedAttributes = Object.entries(attributes.source).reduce((accum, [attributeId, attributeDetails]) => {
				accum.push({
					group: attributeDetails.isBar ? barGroup : valueGroup,
					label: game.i18n.localize(attributeDetails.label),
					value: attributeId,
				});
				return accum;
			}, [] as TokenDocument.TrackedAttributesChoice[]);
			trackedAttributes.sort((left, right) => {
				if (left.group !== right.group) {
					return left.group === barGroup ? -1 : 1;
				} else {
					return left.label.compare(right.label);
				}
			});

			return trackedAttributes;
		} else {
			return super.getTrackedAttributeChoices(attributes);
		}
	}
}
