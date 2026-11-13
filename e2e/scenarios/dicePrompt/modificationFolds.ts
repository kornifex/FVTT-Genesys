import { FOLD_TRANSITION } from '../../descriptions.ts';
import type { PoolModificationsBox, DicePromptContext } from './shared.ts';



export async function modificationFoldsPart(ctx: DicePromptContext) {
	const { e2e, gm, opened, setSetting, skillRoll } = ctx;
	await setSetting('dicePoolCollapseModificationsDetails', true);
	// The Difficulty, DD, shows its dice among the Pool Modifications.
	await opened(gm, skillRoll('Cool'));
	let unfolded: PoolModificationsBox | null = null;
	await e2e.step('#396 A1 GM unfolds the Pool Modifications of a Cool check', async () => {
		unfolded = await gm.evaluate(() => window.dicePromptE2E.togglePoolModifications());
	});
	e2e.expect("#396 A1 the unfolded Pool Modifications show their container whole, after the fold's transition", unfolded, {
		unfolded: true,
		transition: FOLD_TRANSITION,
		height: 'whole',
		visibility: 'visible',
		modifications: true,
	});
	const toggle = () => gm.evaluate(() => window.dicePromptE2E.poolModificationsToggle());
	e2e.expect(
		"#579 E1 the unfolded Pool Modifications' title tells it is expanded, points at their fold, and shows a chevron pointing down",
		await toggle(),
		{ text: 'Pool Modifications', expanded: true, icon: 'fa-chevron-down', controlsFold: true },
	);
	let refolded: PoolModificationsBox | null = null;
	await e2e.step('#396 A2 GM folds the Pool Modifications', async () => {
		refolded = await gm.evaluate(() => window.dicePromptE2E.togglePoolModifications());
	});
	// Folded, the expander keeps the 1px of its container's dotted top border, as on main before the mixin.
	e2e.expect(
		"#396 A2 the folded Pool Modifications keep only their top border and hide their container from Tab, after the fold's transition",
		refolded,
		{
			unfolded: false,
			transition: FOLD_TRANSITION,
			height: 1,
			visibility: 'hidden',
			modifications: true,
		},
	);
	e2e.expect(
		"#579 E2 the folded Pool Modifications' title tells it is collapsed, and shows a chevron pointing right",
		await toggle(),
		{ text: 'Pool Modifications', expanded: false, icon: 'fa-chevron-right', controlsFold: true },
	);
	await gm.evaluate(() => window.dicePromptE2E.closePrompts());
}
