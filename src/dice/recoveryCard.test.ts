import { describe, expect, it } from 'vitest';

import { applyingOnce, mayApplyRecovery, recoveryCardState } from '@/dice/recoveryCard';

describe('mayApplyRecovery', () => {
	it('lets an owner of the patient apply the healing, whoever rolled and whatever the message carries', () => {
		expect(mayApplyRecovery({ ownsPatient: true, isAuthor: false, hasRoll: false })).toBe(true);
	});

	it("lets the healer who rolled apply the healing of a patient they don't own", () => {
		expect(mayApplyRecovery({ ownsPatient: false, isAuthor: true, hasRoll: true })).toBe(true);
	});

	it("refuses the author of a message without a roll, which proves no check, if they don't own the patient", () => {
		expect(mayApplyRecovery({ ownsPatient: false, isAuthor: true, hasRoll: false })).toBe(false);
	});

	it('refuses a user who neither owns the patient nor rolled the check', () => {
		expect(mayApplyRecovery({ ownsPatient: false, isAuthor: false, hasRoll: true })).toBe(false);
	});
});

describe('recoveryCardState', () => {
	it('offers Apply to a user who may heal the patient while the healing is not applied', () => {
		expect(recoveryCardState({ applied: false, mayHeal: true })).toBe('apply');
	});

	it('shows nothing to a user who may not heal the patient', () => {
		expect(recoveryCardState({ applied: false, mayHeal: false })).toBe('none');
	});

	it('shows to everyone that the healing was applied, without Apply', () => {
		expect(recoveryCardState({ applied: true, mayHeal: true })).toBe('applied');
		expect(recoveryCardState({ applied: true, mayHeal: false })).toBe('applied');
	});
});

describe('applyingOnce', () => {
	/** An application that waits until it is released, as a write waits for Foundry's server. */
	function pendingApplication() {
		let release = () => {};
		const written = new Promise<void>((resolve) => (release = resolve));
		let count = 0;
		return {
			apply: async () => {
				count += 1;
				await written;
			},
			release,
			count: () => count,
		};
	}

	it('applies a card not applied yet', async () => {
		const applyOnce = applyingOnce();
		let count = 0;

		expect(await applyOnce({ id: 'card', applied: false }, async () => void (count += 1))).toBe(true);
		expect(count).toBe(1);
	});

	it("doesn't apply a card recorded as applied, as after a re-render or a reload", async () => {
		const applyOnce = applyingOnce();
		let count = 0;

		expect(await applyOnce({ id: 'card', applied: true }, async () => void (count += 1))).toBe(false);
		expect(count).toBe(0);
	});

	it('applies once a card clicked twice at once, before the first application is written', async () => {
		const applyOnce = applyingOnce();
		const application = pendingApplication();

		const first = applyOnce({ id: 'card', applied: false }, application.apply);
		const second = applyOnce({ id: 'card', applied: false }, application.apply);
		application.release();

		expect(await Promise.all([first, second])).toEqual([true, false]);
		expect(application.count()).toBe(1);
	});

	it('applies another card while one is being applied', async () => {
		const applyOnce = applyingOnce();
		const application = pendingApplication();

		const first = applyOnce({ id: 'card', applied: false }, application.apply);
		const other = applyOnce({ id: 'other', applied: false }, application.apply);
		application.release();

		expect(await Promise.all([first, other])).toEqual([true, true]);
	});

	it('lets a card whose application failed be applied again', async () => {
		const applyOnce = applyingOnce();

		await expect(
			applyOnce({ id: 'card', applied: false }, () => Promise.reject(new Error('The server refused the update'))),
		).rejects.toThrow('The server refused the update');
		expect(await applyOnce({ id: 'card', applied: false }, async () => {})).toBe(true);
	});
});
