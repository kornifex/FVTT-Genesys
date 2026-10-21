/**
 * @file Check links: which actor rolls the check of a `@check` link, wherever the link is rendered.
 */

/**
 * The actors a `@check` link can roll for.
 */
export type CheckLinkActors<A> = {
	/**
	 * The actor of the actor sheet the link is in, if any.
	 */
	sheetActor?: A;

	/**
	 * The actors of the tokens the user controls.
	 */
	controlledActors: (A | undefined)[];

	/**
	 * The user's assigned character, if any.
	 */
	assignedCharacter?: A;
};

/**
 * The actor a `@check` link rolls for: the actor of the actor sheet the link is in, otherwise the actor of the user's
 * single controlled token, otherwise the user's assigned character. None when there is none of them.
 */
export function checkLinkActor<A>({ sheetActor, controlledActors, assignedCharacter }: CheckLinkActors<A>): A | undefined {
	const controlledActor = controlledActors.length === 1 ? controlledActors[0] : undefined;

	return sheetActor ?? controlledActor ?? assignedCharacter;
}
