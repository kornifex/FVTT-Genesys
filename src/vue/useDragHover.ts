import { computed, ref } from 'vue';

/**
 * Whether a drag the target accepts hovers it. Bind `enter` and `leave` to the target's `dragenter` and `dragleave`, and
 * `reset` to its drop.
 */
export function useDragHover(accepts: (event: DragEvent) => boolean = () => true) {
	// A drag entering a child of the target fires `dragenter` on the child before `dragleave` on the target, so a flag
	// would turn off while the drag is still inside: the target counts the elements the drag is in instead.
	const count = ref(0);

	return {
		isHovered: computed(() => count.value > 0),
		enter: (event: DragEvent) => {
			if (accepts(event)) {
				count.value += 1;
			}
		},
		leave: (event: DragEvent) => {
			if (accepts(event)) {
				// A drag started inside the target leaves elements it never entered.
				count.value = Math.max(0, count.value - 1);
			}
		},
		reset: () => {
			count.value = 0;
		},
	};
}
