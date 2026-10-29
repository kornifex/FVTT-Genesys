/**
 * A number written with its sign, as a modifier added to something: `+2`, `+0`, `-1`.
 */
export function signed(value: number) {
	return value < 0 ? `${value}` : `+${value}`;
}
