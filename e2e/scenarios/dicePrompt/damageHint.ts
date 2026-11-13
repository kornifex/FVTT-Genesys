import { installDicePromptHelpers, type DicePromptContext } from './shared.ts';



export async function damageHintPart(ctx: DicePromptContext) {
	const { e2e, gm } = ctx;
	const settingText = () => gm.evaluate(() => window.dicePromptE2E.settingText('genesys.showDamageOnFailure'));
	const showIn = async (language: string) => {
		await gm.evaluate((language) => game.settings.set('core', 'language', language), language);
		await gm.reload();
		await gm.evaluate(installDicePromptHelpers);
	};
	const settingTexts: Record<string, unknown> = { en: await settingText() };
	try {
		for (const language of ['fr', 'es']) {
			await showIn(language);
			settingTexts[language] = await settingText();
		}
	} finally {
		await showIn('en');
	}
	e2e.expect(
		'#434 Q1 the hint of Show Attack Damage On Failure names the damage and the Critical, and says the qualities always show, in en, fr and es',
		settingTexts,
		{
			en: {
				language: 'en',
				name: 'Show Attack Damage On Failure',
				hint: 'Whether to show Damage and Critical on attack roll chat cards even when the roll was a failure. Qualities always show, since some trigger on a failure.',
			},
			fr: {
				language: 'fr',
				name: "Montrer les dommages de l'attaque en cas d'échec",
				hint: "Afficher ou non les dégâts et le critique sur les cartes de discussion des jets d'attaque, même en cas d'échec. Les attributs s'affichent toujours, car certains se déclenchent sur un échec.",
			},
			es: {
				language: 'es',
				name: 'Muestra el daño del ataque cuando falle',
				hint: 'Mostrar o no el daño y el crítico en las tarjetas de chat de las tiradas de ataque, incluso cuando la tirada haya sido un fracaso. Las cualidades se muestran siempre, ya que algunas se activan con un fracaso.',
			},
		},
	);
	await e2e.step('Q end');
}
