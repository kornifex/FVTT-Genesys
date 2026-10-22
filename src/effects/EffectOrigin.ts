/**
 * The id of the item an effect's origin points to within an actor, or undefined if it points to none.
 */
export function originItemId(origin: string | null) {
	return origin?.includes('.Item.') ? origin.split('.Item.')[1] : undefined;
}
