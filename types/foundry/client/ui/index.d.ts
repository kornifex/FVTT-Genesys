import './context';
import './dialog';
import './drag-drop';
import './filepicker';
import './notifications';
import './tabs';
import './tooltip';
import './tour';

declare global {
	interface FoundryUI<
		TActor extends Actor = Actor,
		TActorDirectory extends
			foundry.applications.sidebar.tabs.ActorDirectory<TActor> = foundry.applications.sidebar.tabs.ActorDirectory<TActor>,
		TItem extends Item<TActor> = Item<TActor>,
		TItemDirectory extends
			foundry.applications.sidebar.tabs.ItemDirectory<TItem> = foundry.applications.sidebar.tabs.ItemDirectory<TItem>,
		TChatMessage extends ChatMessage<TActor> = ChatMessage<TActor>,
		TChatLog extends ChatLog<TChatMessage> = ChatLog<TChatMessage>,
		TCompendiumDirectory extends CompendiumDirectory = CompendiumDirectory,
		TCombat extends Combat = Combat,
		TCombatTracker extends CombatTracker<TCombat> = CombatTracker<TCombat>,
	> {
		actors: TActorDirectory;
		chat: TChatLog;
		combat: TCombatTracker;
		compendium: TCompendiumDirectory;
		controls: SceneControls;
		items: TItemDirectory;
		notifications: Notifications;
		settings: Settings;
		tables: RollTableDirectory;
		windows: Record<number, Application>;
	}
}
