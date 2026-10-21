# Publish the fork under the existing `genesys` id

The original Genesys system (Mezryss/FVTT-Genesys) is no longer maintained. Its maintainer, Assembling Kings, said in [Mezryss#263](https://github.com/Mezryss/FVTT-Genesys/issues/263#issuecomment-5642736832) that they will likely not update it anymore, and are working on a rewrite from scratch under a different id (`ak-genesys`). So this fork becomes the published version. We keep the package id `genesys` and distribute through the fork's GitHub releases, installed by manifest URL. We do not register a new id on the Foundry package registry, where `genesys` belongs to the original author.

The id is the namespace of every world setting (`genesys.*`), document flag and socket channel, and each world records it as its system. A new id would force a risky migration of every existing world, ours included, in exchange for registry visibility.

## Consequences

- The system isn't listed in the Foundry registry. Tables install it by pasting the fork's manifest URL. Once installed that way, Foundry looks for updates on the fork.
- An install made from the original author's manifest keeps checking the original release feed until it is reinstalled from the fork's manifest.
- The registry listing for `genesys` still points to the original repository. If that listing ever shows a higher version than the fork's, Foundry v12/v13 offers to switch the install back to it, and v14 (from 14.366) switches silently on update. The fork's versions must stay ahead of the original's, hence the jump to 0.3.0 for its first release.
