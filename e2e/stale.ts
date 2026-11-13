/** @file Tells a `--compare` run that its branch lacks commits of the ref, whose steps would show as differences. */

/**
 * The message that stops a comparison, or undefined when HEAD holds every commit of the ref.
 * @param ref The ref compared against.
 * @param missing How many commits of the ref HEAD lacks (`git rev-list --count HEAD..<ref>`).
 */
export function staleMessage(ref: string, missing: number) {
	if (missing === 0) return undefined;
	return [
		`HEAD lacks ${missing} ${missing === 1 ? 'commit that' : 'commits that'} ${ref} holds: the steps they changed would show as differences that have nothing to do with this change.`,
		`Merge it into the branch (git merge ${ref}), or compare against the branch point (--compare $(git merge-base HEAD ${ref})).`,
	].join('\n');
}
