/**
 * The system manifest of a release: its version comes from the tag, and its download points to the archive attached to that release.
 * Foundry checks for updates through the manifest of the latest release, so an install always gets the archive that matches its manifest.
 */
export function releaseManifest(manifest: Record<string, unknown>, repository: string, tag: string): Record<string, unknown> {
	return {
		...manifest,
		version: tag.replace(/^v/, ''),
		download: `https://github.com/${repository}/releases/download/${tag}/genesys.zip`,
	};
}
