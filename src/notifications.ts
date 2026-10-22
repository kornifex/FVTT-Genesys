/**
 * A notification to show the user, as a localization key and its format arguments.
 */
export type Notification = {
	key: string;
	data?: Record<string, unknown>;
};

/**
 * Show a notification to the user.
 */
export function notify({ key, data }: Notification) {
	ui.notifications.info(game.i18n.format(key, data as Record<string, string>));
}
