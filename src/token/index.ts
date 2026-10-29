import { GenesysTokenDocument } from '@/token/GenesysTokenDocument';

/**
 * Register the token document with Foundry.
 */
export function register() {
	CONFIG.Token.documentClass = GenesysTokenDocument;
}
