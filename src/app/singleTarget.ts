/**
 * The actor of the user's single target, or undefined when the user targets none or several: a check, a heal or an attack
 * only reads a target when there is no doubt about which one.
 */
export function singleTargetActor() {
	const [target] = game.user.targets.size === 1 ? game.user.targets : [];
	return target?.actor ?? undefined;
}
