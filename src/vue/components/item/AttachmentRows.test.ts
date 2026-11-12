// @vitest-environment happy-dom
/** @file Tests for the attachments of a weapon or an armor, as their rows show and remove them. */

import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type App, h } from 'vue';
import AttachmentRows from '@/vue/components/item/AttachmentRows.vue';
import { provideSheetContext } from '@/vue/SheetContext';
import type { ContainedAttachment } from '@/item/data/Attachments';
import { confirmDelete } from '@/operations/ItemActions';

vi.mock('@/operations/ItemActions', () => ({ confirmDelete: vi.fn() }));
// The description's editor is Foundry's.
vi.mock('@/vue/components/Editor.vue', () => ({ default: { render: () => null } }));

beforeEach(() => {
	vi.stubGlobal('game', {
		i18n: {
			localize: (key: string) => key,
			format: (key: string, data: Record<string, string>) => `${key} ${Object.values(data).join(', ')}`,
		},
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

const scope = (id: string): ContainedAttachment => ({ id, name: 'Scope', description: '', hardPointsRequired: 1 });

function mountRows(attachments: ContainedAttachment[], hardPoints: number, onChange = vi.fn()) {
	return mount(() => h(AttachmentRows, { attachments, hardPoints, onChange }), {
		global: { plugins: [{ install: (app: App) => void provideSheetContext(app, { sheet: {}, document: {}, editable: true }) }] },
	});
}

describe('AttachmentRows', () => {
	it('warns when the attachments take more Hard Points than the item has, and holds them all (CRB p. 206)', () => {
		expect(
			mountRows([scope('a1')], 1)
				.find('.over-hard-points')
				.exists(),
		).toBe(false);

		const rows = mountRows([scope('a1'), scope('a2')], 1);
		expect(rows.findAll('.attachment')).toHaveLength(2);
		expect(rows.get('.over-hard-points').text()).toBe('Genesys.Labels.HardPointsOver 2, 1');
	});

	it('removes the attachment the user confirms, leaving its twin installed', async () => {
		vi.mocked(confirmDelete).mockResolvedValue(true);
		const onChange = vi.fn();
		const rows = mountRows([scope('a1'), scope('a2')], 2, onChange);

		await rows.findAll('.attachment')[1].get('button').trigger('click');
		await flushPromises();

		expect(confirmDelete).toHaveBeenCalledWith('Scope');
		expect(onChange).toHaveBeenCalledExactlyOnceWith([scope('a1')]);
	});
});
