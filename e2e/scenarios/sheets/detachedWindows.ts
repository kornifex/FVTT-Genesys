import type { SheetsContext } from './shared.ts';



export async function detachedWindowsPart(ctx: SheetsContext) {
	const { e2e, gm, page } = ctx;
	if (e2e.version >= 14) {
		const detachedErrors: string[] = [];
		page()
			.context()
			.on('page', (detached) => {
				detached.on('pageerror', (error) => detachedErrors.push(error.message));
				detached.on('console', (message) => {
					if (message.type() === 'error') detachedErrors.push(message.text());
				});
			});

		let sheet: unknown;
		await e2e.step('#423 GM detaches the sheet of Hero, uses it, then attaches it back', async () => {
			sheet = await gm.evaluate(async () => {
				const { settle, waitFor } = window.e2e;
				const actor = window.e2e.actor('Hero');
				const app = actor.sheet;
				await window.e2e.render(app);
				const look = () => {
					const style = (selector: string) => {
						const element = app.element.querySelector(selector)!;
						const computed = element.ownerDocument.defaultView!.getComputedStyle(element);
						return [computed.fontFamily, computed.color, computed.backgroundColor, computed.fontSize].join(' ');
					};
					return ['.window-content', 'nav.sheet-tabs [data-tab]', 'input[name="system.silhouette"]'].map(style);
				};
				const attachedLook = look();
				const silhouette = actor.system.silhouette;

				await app.detachWindow();
				await waitFor('the detached sheet', () => app.element.ownerDocument !== document && app.rendered);
				await settle();
				const root: HTMLElement = app.element;
				const detached = root.ownerDocument !== document;
				const sameLook = JSON.stringify(look()) === JSON.stringify(attachedLook);

				root.querySelector<HTMLElement>('nav.sheet-tabs [data-tab="talents"]')!.click();
				await settle();
				const tabShown = !!root.querySelector('.tab[data-tab="talents"].active');

				const field = () => root.querySelector<HTMLInputElement>('input[name="system.silhouette"]')!;
				await actor.update({ 'system.silhouette': silhouette + 1 });
				await settle();
				const updateShown = field().value === String(silhouette + 1);

				field().value = String(silhouette + 2);
				field().dispatchEvent(new Event('change', { bubbles: true }));
				await settle();
				const fieldWritten = actor.system.silhouette === silhouette + 2;

				await actor.update({ 'system.silhouette': silhouette });
				app.attachWindow();
				await settle();
				const attached = app.element.ownerDocument === document;
				await app.close();
				return { detached, sameLook, tabShown, updateShown, fieldWritten, attached };
			});
		});
		e2e.expect(
			"#423 A1 a detached sheet keeps its look, shows its tabs and its actor's updates, writes its fields, and attaches back",
			sheet,
			{
				detached: true,
				sameLook: true,
				tabShown: true,
				updateShown: true,
				fieldWritten: true,
				attached: true,
			},
		);

		let prompt: unknown;
		await e2e.step('#423 GM detaches the Dice Roller, adds a die and rolls', async () => {
			prompt = await gm.evaluate(async () => {
				const { settle, waitFor, poolPreview } = window.e2e;
				canvas?.tokens?.releaseAll();
				await ui.chat.processMessage('/gendr');
				const app = await waitFor('the Dice Roller', () =>
					[...foundry.applications.instances.values()].find((candidate: { element?: HTMLElement }) =>
						candidate.element?.querySelector('.dice-prompt'),
					),
				);
				await app.detachWindow();
				await waitFor('the detached Dice Roller', () => app.element.ownerDocument !== document && app.rendered);
				await settle();
				const root: HTMLElement = app.element;
				const detached = root.ownerDocument !== document;
				const before = poolPreview(root);
				root.querySelector<HTMLElement>('.dice-box button')!.click();
				await settle();
				const after = poolPreview(root);
				const messages = game.messages.size;
				root.querySelector<HTMLElement>('.roll-button')!.click();
				await settle();
				return { detached, poolChanged: before !== after, rolled: game.messages.size === messages + 1, closed: !app.rendered };
			});
		});
		e2e.expect('#423 A2 a detached Dice Roller changes its pool and rolls', prompt, {
			detached: true,
			poolChanged: true,
			rolled: true,
			closed: true,
		});
		e2e.expect('#423 A3 the detached windows log no error', detachedErrors, []);
	}
}
