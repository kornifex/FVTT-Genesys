import { onBeforeUnmount, onMounted, type Ref } from 'vue';

function fit(textarea: HTMLTextAreaElement) {
	// Shrinking the textarea to measure its content may clamp the scroll of the windows holding it: it is put back.
	const scrolled: [Element, number][] = [];
	for (let parent = textarea.parentElement; parent; parent = parent.parentElement) {
		if (parent.scrollTop) scrolled.push([parent, parent.scrollTop]);
	}

	textarea.style.height = 'auto';
	const style = getComputedStyle(textarea);
	const frame =
		style.boxSizing === 'border-box'
			? textarea.offsetHeight - textarea.clientHeight
			: -(parseFloat(style.paddingTop) + parseFloat(style.paddingBottom));
	textarea.style.height = `${textarea.scrollHeight + frame}px`;

	for (const [parent, scrollTop] of scrolled) parent.scrollTop = scrollTop;
}

/**
 * Sizes the HTML source textarea of the editor rooted at `root` to the HTML it holds. On v12, the HTML source mode of the
 * ProseMirror menu adds a `<textarea>` to the closest `.editor` to its view, which keeps the height of two rows whatever
 * its HTML, where v13's `<code-mirror>` grows with its text. The v12 desktop app's Chromium 122 has no CSS
 * `field-sizing`, so the textarea is sized when it is added, on each input, and when a width change wraps its lines anew.
 */
export function useFitSourceTextarea(root: Ref<HTMLElement | null>) {
	// Each width seen, by textarea: fitting it changes its height alone, which needs no new fit.
	const widths = new WeakMap<Element, number>();
	const resizeObserver = new ResizeObserver((entries) => {
		for (const { target, contentRect } of entries) {
			if (widths.get(target) === contentRect.width) continue;
			widths.set(target, contentRect.width);
			fit(target as HTMLTextAreaElement);
		}
	});
	const mutationObserver = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			for (const node of mutation.addedNodes) {
				if (!(node instanceof HTMLTextAreaElement)) continue;
				fit(node);
				resizeObserver.observe(node);
			}
			for (const node of mutation.removedNodes) {
				if (node instanceof HTMLTextAreaElement) resizeObserver.unobserve(node);
			}
		}
	});

	onMounted(() => {
		const element = root.value!;
		mutationObserver.observe(element, { childList: true });
		element.addEventListener('input', (event) => {
			if (event.target instanceof HTMLTextAreaElement && event.target.parentElement === element) fit(event.target);
		});
	});
	onBeforeUnmount(() => {
		mutationObserver.disconnect();
		resizeObserver.disconnect();
	});
}
