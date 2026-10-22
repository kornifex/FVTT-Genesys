import { register as registerCampaignSettings } from '@/settings/campaign';
import { register as registerStoryPoints } from '@/settings/storyPoints';
import { register as registerUser } from '@/settings/user';

import { register as registerAlpha } from '@/settings/alpha';

/**
 * Namespace used to access system settings from {@link Game.settings}.
 */
export const NAMESPACE = 'genesys';

/**
 * Register all system settings.
 */
export function register() {
	registerCampaignSettings(NAMESPACE);
	registerStoryPoints(NAMESPACE);
	registerUser(NAMESPACE);

	registerAlpha(NAMESPACE);
}
