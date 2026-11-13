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
	const optionLook = 'option rgb(247, 243, 232) | rgb(0, 0, 0)';
	const characterLooks = ['input drawn by its component'];
	const adversaryLooks = ['characteristic center', 'input drawn by its component', 'input flat'];
	const itemLooks = ['input drawn by its component', 'input flat'];
	const withSelects = [...itemLooks, optionLook, 'select flat'].sort();
	e2e.expect(
		"#95 B1 every sheet's text fields and selects have the system's flat look or their component's, with no shadow, and an archetype's characteristic values aren't centred",
		Object.fromEntries(Object.entries(fieldLooks).map(([name, looks]) => [name, lookKinds(looks)])),
		{
			Hero: characterLooks,
			Minion: adversaryLooks,
			Rival: adversaryLooks,
			Nemesis: adversaryLooks,
			Vehicle: [...characterLooks, optionLook, 'select flat'].sort(),
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
