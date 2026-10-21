import type { DirectiveBinding } from 'vue';
import * as log from '@/log';

function doLocalize(el: HTMLInputElement, binding: DirectiveBinding<unknown, string>) {
	if (typeof binding.arg !== 'string') {
		log.warn(`Attempt to localize non-string attribute '${binding.arg}'`);
		return;
	}

	if (typeof binding.value !== 'string' || binding.value.trim().length === 0) {
		log.warn(`Attempt to localize non-string or empty key '${String(binding.value)}'`);
		return;
	}

	const localized = game.i18n.localize(binding.value);

	binding.arg.split(',').forEach((attribute) => {
		el.setAttribute(attribute, localized);
	});
}

export const vLocalize = {
	beforeMount: doLocalize,
	updated: doLocalize,
};
