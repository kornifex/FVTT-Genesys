import type { ScenarioContext } from '../../scenario.ts';
import type { Evaluate } from './shared.ts';

/**
 * §#242: on Foundry v14, a talent's `token.*` changes, which apply to its actor's tokens, count once per rank too, each
 * time a token is prepared.
 */
export async function talentTokenChanges(e2e: ScenarioContext, page: Evaluate) {
	const T = 'Lantern';
	const light = () => page((name) => window.characterE2E.tokenLight(name), T);
	// A scene of its own, which no client views: a token's data is prepared whether a canvas draws it or not.
	await e2e.step('#242 B0 a character without talents, with a linked token on a scene', () =>
		page(async (name) => {
			const left = game.scenes.getName(`E2E ${name}`);
			await left?.delete();
			const scene = await Scene.create({ name: `E2E ${name}`, width: 1000, height: 1000 });
			const actor = await Actor.create({ name: `E2E ${name}`, type: 'character', prototypeToken: { actorLink: true } });
			await scene.createEmbeddedDocuments('Token', [{ ...(await actor.getTokenDocument()).toObject(), x: 100, y: 100 }]);
		}, T),
	);
	const before = await light();
	const added = async () => {
		const now = await light();
		return { dim: now.dim - before.dim, bright: now.bright - before.bright };
	};
	await e2e.step("#242 B1 a rank 3 talent added, whose effect adds 2 to its token's dim light radius and 1 to its bright one", () =>
		page(
			(name) =>
				window.characterE2E.createItems(name, [
					{
						name: 'E2E Glowing',
						type: 'talent',
						system: { activation: { type: 'passive', detail: '' }, tier: 1, ranked: 'yes', rank: 3 },
						effects: [
							{
								name: 'E2E Glowing',
								transfer: true,
								changes: [
									{ key: 'token.light.dim', mode: 2, value: 2 },
									{ key: 'token.light.bright', mode: 2, value: '1' },
								],
							},
						],
					},
				]),
			T,
		),
	);
	e2e.expect("#242 B1 each token change of a rank 3 talent counts three times on the actor's token", await added(), {
		dim: 6,
		bright: 3,
	});
	await e2e.step('#242 B2 the token moved, which prepares it again', () =>
		page(async (name) => {
			const [token] = game.scenes.getName(`E2E ${name}`).tokens;
			await token.update({ x: token.x + 100 });
		}, T),
	);
	e2e.expect('#242 B2 a token prepared again still counts each token change three times', await added(), { dim: 6, bright: 3 });
	await page((name) => game.scenes.getName(`E2E ${name}`).delete(), T);
}
