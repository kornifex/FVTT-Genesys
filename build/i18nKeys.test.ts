import { describe, expect, it } from 'vitest';

import { checkKeys, keyReferences } from './i18nKeys.ts';

describe('keyReferences', () => {
	it('finds the quoted keys of the system namespaces', () => {
		const source = `
			game.i18n.localize('Genesys.Labels.Range');
			<Localized label="Genesys.Tabs.Skills" />
			ui.notifications.warn('COMBAT.NoneRemaining');
		`;

		expect(keyReferences(source)).toEqual(['Genesys.Labels.Range', 'Genesys.Tabs.Skills']);
	});

	it('turns each interpolation of a template literal into a wildcard', () => {
		const source = `
			game.i18n.localize(\`Genesys.CharacteristicAbbr.\${skill.characteristic.capitalize()}\`);
			:data-tooltip="\`Genesys.DicePrompt.ChanceToSucceedBy\${permutation ? 'Permutation' : 'Simulation'}Disclaimer\`"
		`;

		expect(keyReferences(source)).toEqual(['Genesys.CharacteristicAbbr.*', 'Genesys.DicePrompt.ChanceToSucceedBy*Disclaimer']);
	});

	it('turns the operands of a concatenation into wildcards', () => {
		const source = `
			game.i18n.localize('Genesys.Equipment.DamageState.' + state);
			{{ localize (concat 'Genesys.StoryPoints.ChatMessage' (capitalize type) 'Pool') }}
			{{ localize (concat 'Genesys.Range.' (capitalize system.range)) }}
		`;

		expect(keyReferences(source)).toEqual([
			'Genesys.Equipment.DamageState.*',
			'Genesys.StoryPoints.ChatMessage*Pool',
			'Genesys.Range.*',
		]);
	});
});

describe('checkKeys', () => {
	const en = {
		TYPES: { Actor: { character: 'Character' } },
		Genesys: {
			Labels: { Range: 'Range', Soak: 'Soak' },
			Range: { Short: 'Short', Long: 'Long' },
		},
	};

	it('reports the references that match no English key, with the files using them', () => {
		const references = new Map([
			['Genesys.Labels.Range', ['src/A.vue']],
			['Genesys.Range.*', ['src/B.ts']],
			['Genesys.Labels.Typo', ['src/A.vue', 'src/C.ts']],
			['Genesys.Labels.*Defense', ['src/D.vue']],
		]);

		expect(checkKeys(references, en, en).missing).toEqual([
			{ key: 'Genesys.Labels.Typo', files: ['src/A.vue', 'src/C.ts'] },
			{ key: 'Genesys.Labels.*Defense', files: ['src/D.vue'] },
		]);
	});

	it('reports the English keys no reference matches, except the document types Foundry localizes itself', () => {
		const references = new Map([
			['Genesys.Labels.Range', ['src/A.vue']],
			['Genesys.Range.*', ['src/B.ts']],
		]);

		expect(checkKeys(references, en, en).unused).toEqual(['Genesys.Labels.Soak']);
	});

	it('reports the English keys the French file lacks', () => {
		const fr = {
			TYPES: { Actor: { character: 'Personnage' } },
			Genesys: { Labels: { Range: 'Portée', Soak: 'Encaissement' }, Range: { Short: 'Courte' } },
		};

		expect(checkKeys(new Map(), en, fr).untranslated).toEqual(['Genesys.Range.Long']);
	});
});
