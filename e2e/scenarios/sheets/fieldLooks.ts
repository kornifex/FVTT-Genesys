import type { SheetsContext } from './shared.ts';

export async function fieldLooksPart(ctx: SheetsContext, actorTypes: string[], itemTypes: string[]) {
	const { e2e, gm } = ctx;
	const fieldLooks: Record<string, Record<string, number>> = {};
	await e2e.step('#95 GM opens each sheet and reads the look of its fields on each tab', async () => {
		for (const name of [...actorTypes, ...itemTypes]) {
			await gm.evaluate((name) => window.sheetsE2E.open(name), name);
			fieldLooks[name] = await gm.evaluate((name) => window.sheetsE2E.fieldLooks(name), name);
			await gm.evaluate((name) => window.sheetsE2E.close(name), name);
		}
	});
	// The part runs in the light theme. The dark theme gives the Palette other colours, which the options' popup must take
	// too (#926): the sheets with selects are read again in it, for their options alone.
	const darkOptionLooks: Record<string, string[]> = {};
	const optionLooksOf = (looks: Record<string, number>) => Object.keys(looks).filter((look) => look.startsWith('option '));
	await e2e.step('#95 GM opens each sheet with selects again in the dark theme and reads the look of their options', async () => {
		if (!(await gm.evaluate(() => document.body.classList.replace('theme-light', 'theme-dark')))) {
			throw new Error('the GM is not in the light theme, so the dark one cannot replace it');
		}
		try {
			for (const name of Object.keys(fieldLooks).filter((name) => optionLooksOf(fieldLooks[name]).length > 0)) {
				await gm.evaluate((name) => window.sheetsE2E.open(name), name);
				const looks = await gm.evaluate((name) => window.sheetsE2E.fieldLooks(name), name);
				await gm.evaluate((name) => window.sheetsE2E.close(name), name);
				darkOptionLooks[name] = optionLooksOf(looks).map((look) => `dark ${look}`);
			}
		} finally {
			await gm.evaluate(() => document.body.classList.replace('theme-dark', 'theme-light'));
		}
	});
	// A look reads `<tag> <shadow> | <background> | <border> | <radius>`, or `option <background> | <colour>`. A field
	// either takes AppV1's flat look, or a component draws it itself without a border, as a name in a header or a value in
	// a circle; neither has a shadow.
	const flat = 'none | rgba(0, 0, 0, 0.05) | 1px solid rgb(122, 121, 113) | 3px';
	const lookKinds = (looks: Record<string, number>) => {
		const kinds = new Set<string>();
		for (const look of Object.keys(looks)) {
			const [tag, ...rest] = look.split(' ');
			const style = rest.join(' ');
			if (tag === 'option' || tag === 'characteristic') kinds.add(look);
			else if (style === flat) kinds.add(`${tag} flat`);
			else if (/^none \| .+ \| 0px none .+ \| 0px$/.test(style)) kinds.add(`${tag} drawn by its component`);
			else kinds.add(look);
		}
		return [...kinds].sort();
	};
	e2e.log('#95 field looks', fieldLooks);
	// The options take the Palette's text over its paper, in either theme, which the browser's popup needs opaque (#926).
	const optionLooks = ['option paper | text', 'dark option paper | text'];
	const characterLooks = ['input drawn by its component'];
	const adversaryLooks = ['characteristic center', 'input drawn by its component', 'input flat'];
	const itemLooks = ['input drawn by its component', 'input flat'];
	const withSelects = [...itemLooks, ...optionLooks, 'select flat'].sort();
	e2e.expect(
		"#95 B1 every sheet's text fields and selects have the system's flat look or their component's, with no shadow, and an archetype's characteristic values aren't centred",
		Object.fromEntries(
			Object.entries(fieldLooks).map(([name, looks]) => [name, [...lookKinds(looks), ...(darkOptionLooks[name] ?? [])].sort()]),
		),
		{
			Hero: characterLooks,
			Minion: adversaryLooks,
			Rival: adversaryLooks,
			Nemesis: adversaryLooks,
			Vehicle: [...characterLooks, ...optionLooks, 'select flat'].sort(),
			ability: withSelects,
			additionalEffect: itemLooks,
			archetype: ['characteristic start', ...itemLooks],
			armor: itemLooks,
			attachment: itemLooks,
			career: itemLooks,
			consumable: itemLooks,
			container: itemLooks,
			injury: withSelects,
			gear: itemLooks,
			skill: withSelects,
			spell: withSelects,
			talent: withSelects,
			quality: withSelects,
			weapon: withSelects,
			vehicleWeapon: withSelects,
		},
	);
}
