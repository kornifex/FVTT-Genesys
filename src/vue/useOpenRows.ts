import { reactive } from 'vue';

/**
 * The rows of a list whose description is open, by their key: each opens and closes on its own, and every row starts
 * closed. Nothing is stored on the document: the rows open closed each time the sheet opens, as a talent's description.
 */
export function useOpenRows() {
	const open = reactive(new Set<string>());

	return {
		isOpen: (key: string) => open.has(key),
		toggle: (key: string) => {
			if (!open.delete(key)) {
				open.add(key);
			}
		},
	};
}
