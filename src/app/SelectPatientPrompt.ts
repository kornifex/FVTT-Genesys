/** @file The prompt that picks the patient a healer heals, when they target none. */

import { VuePrompt } from '@/vue/VuePrompt';
import VueSelectPatientPrompt from '@/vue/apps/SelectPatientPrompt.vue';

/**
 * A patient the prompt offers: their uuid, name and portrait.
 */
type PatientOption = { uuid: string; name: string; img: string | null };

/**
 * What the patient prompt shows: the patients to pick from.
 */
export type SelectPatientPromptContext = {
	patients: PatientOption[];
};

/**
 * Prompt the user for the patient a healer heals. It answers with the patient's uuid.
 */
export class SelectPatientPrompt extends VuePrompt<string | undefined>(undefined) {
	override get vueComponent() {
		return VueSelectPatientPrompt;
	}

	static override DEFAULT_OPTIONS = {
		classes: ['app-select-patient-prompt'],
		position: { width: 100 },
		window: { title: 'Genesys.Recovery.PatientPrompt' },
	};

	/**
	 * Ask the user to pick one of the patients. Undefined when the prompt is closed.
	 */
	static async promptForPatient<P extends PatientOption>(patients: P[]): Promise<P | undefined> {
		const uuid = await new SelectPatientPrompt(patients.map(({ uuid, name, img }) => ({ uuid, name, img }))).prompt();
		return patients.find((patient) => patient.uuid === uuid);
	}

	readonly patients: PatientOption[];

	constructor(patients: PatientOption[]) {
		super();

		this.patients = patients;
	}

	override async getVueContext(): Promise<SelectPatientPromptContext> {
		return { patients: this.patients };
	}
}
