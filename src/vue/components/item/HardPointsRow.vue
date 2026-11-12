<script lang="ts" setup>
import { computed, useId } from 'vue';
import { useSheetDocument } from '@/vue/useSheetDocument';
import { GenesysItem } from '@/item/GenesysItem';
import { hardPoints, hardPointsException } from '@/item/HardPoints';
import Localized from '@/vue/components/Localized.vue';
import Tooltip from '@/vue/components/Tooltip.vue';

// The Hard Points come from the base encumbrance, the stored one, which an attachment's effect may change.
const { document: item, source } = useSheetDocument<GenesysItem<'weapon' | 'armor'>>();
const id = useId();

const value = computed(() => hardPoints(source.value));

// The field is unnamed, so that the sheet's form doesn't submit the computed number as an exception whenever another
// field changes: its own change stores the exception, or clears it to follow the encumbrance again.
async function update(event: Event) {
	const input = event.target as HTMLInputElement;
	const exception = hardPointsException(source.value.encumbrance, input.value);

	if (exception === undefined || exception === source.value.hardPoints) {
		// Nothing to store, so the sheet won't render again: show the item's number in place of what was typed.
		input.value = String(value.value);
		return;
	}

	await item.value.update({ system: { hardPoints: exception } });
}
</script>

<template>
	<div class="row">
		<label :for="id">
			<Tooltip content="Genesys.Tooltips.HardPoints" localized><Localized label="Genesys.Labels.HardPoints" /></Tooltip>
		</label>
		<input :id="id" class="hard-points" type="number" min="0" step="1" :value="value" @change="update" />
	</div>
</template>
