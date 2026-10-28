# FVTT Genesys
An implementation of [EDGE Studio](https://edge-studio.net/)'s Genesys roleplaying game.

## About this fork
This repository continues the Genesys system created by [Mezryss](https://github.com/Mezryss/FVTT-Genesys) and maintained for a long time by Assembling Kings, with contributions from KitCat420 and many others. Thank you all for building it: nearly everything you see in this system is their work.

In [September 2026](https://github.com/Mezryss/FVTT-Genesys/issues/263#issuecomment-5642736832), Assembling Kings announced that the original system would likely not receive further updates, and that they are focusing on [a new implementation written from scratch](https://git.gay/assembling.kings/genesys). That new system is still in progress and not yet recommended for running games. It uses a different system id (`ak-genesys`), so worlds don't carry over between the two.

This fork keeps the existing system going for tables with ongoing campaigns: support for newer Foundry versions, bug fixes, and optional house rules. It keeps the original system id (`genesys`), so your existing worlds, actors and settings work as they are, with no migration. The reasoning is recorded in [ADR 0002](docs/adr/0002-publish-fork-under-genesys-id.md).

## AI assistance
Development on this fork, after release 0.2.19, is done with the assistance of Claude (Anthropic), through Claude Code. Every change is reviewed, tested in play and owned by the maintainer. Code inherited from the original project, up to and including release 0.2.19, predates the fork and is not covered by this note.

## Installation
In Foundry's Setup screen, open **Game Systems → Install System**, and paste this manifest URL:

```
https://github.com/kornifex/FVTT-Genesys/releases/latest/download/manifest.json
```

The system isn't listed in Foundry's package browser: the `genesys` listing there points to the original repository.

## Migrating from the original system
If your table installed Genesys from the original repository, switch it to this fork once:

1. [Back up](https://foundryvtt.com/article/backups/) your worlds.
2. In **Game Systems → Install System**, paste the manifest URL above. Foundry replaces the installed system in place; there is no need to uninstall it first.
3. That's it. Your worlds and their data are untouched, and future updates come from this fork.

If Foundry ever offers to switch this system's source back to the original repository, decline.

## Documentation
The [wiki](https://github.com/kornifex/FVTT-Genesys/wiki) documents the system for players and GMs.

## Screenshots
#### Character Sheet
![Player Character](screenshots/character.png)

#### Minion Sheet
![Minion](screenshots/minion.png)

#### Rival Sheet
![Rival](screenshots/rival.png)

#### Archetype Sheet
![Archetype](screenshots/archetype.png)

## Contributing
Bug reports and feature requests are welcome in the [issue tracker](https://github.com/kornifex/FVTT-Genesys/issues), and so are pull requests, with no guarantee on response time.

All pull requests and forks must adhere to the following:
- Respect the FontAwesome licensing: only use FontAwesome Free icons in your contributions.
- If adapting code from other sources, you must update the "Further Licenses" section below to indicate its licensing and include an appropriately-placed license file where applicable.
- All contributions to this project, unless otherwise noted through licenses as mentioned above, fall under the project's MIT License.
- AI-assisted contributions are accepted, as long as you say so in the pull request, and you have reviewed and tested the changes yourself.
- Contributors who act in a bad faith, hateful, or otherwise harmful manner will be blocked from making future contributions. This includes notable behavior outside this system and its community.

## License
Code for this system is licensed under the [MIT License](https://mit-license.org/), see [LICENSE](LICENSE).

### Further Licenses
Some components of this project are used under alternative licensing terms. Each of these components will be accompanied by its own nearby LICENSE file, and is noted below:

#### FontAwesome
> **License:** [Font Awesome Free License](https://fontawesome.com/license/free)
>
> This system uses the FontAwesome icons packaged with Foundry VTT, and only icons from the FontAwesome Free set. Foundry's license to use and distribute FontAwesome Pro icons covers Foundry itself. Based on information shared in the [FoundryVTT Discord Server](https://discord.gg/foundryvtt), it ***does not*** include systems developed for Foundry by third-party creators, and this project holds no Pro license of its own.
>
> This means:
> 1) Contributions must only use FontAwesome Free icons, even though Foundry also displays Pro ones.
> 2) If you fork this project and want to use FontAwesome Pro icons, you are responsible for purchasing an appropriate license.

#### Foundry Type Data
> Foundry type data was initially pulled from the [Pathfinder 2E System](https://github.com/foundryvtt/pf2e), and has been modified in multiple places to suit the needs of this project.
>
> **License:** [Apache 2.0](types/foundry/LICENSE)

#### Fonts: Bebas Neue, Roboto Serif, Roboto Slab, Roboto Mono
> **License:** [Open Font License](public/assets/fonts/OFL.txt)

#### Font: Roboto
> **License:** [Apache 2.0](public/assets/fonts/Roboto/LICENSE.txt)

#### Font: Roboto Condensed
> **License:** [Apache 2.0](public/assets/fonts/Roboto_Condensed/LICENSE.txt)

#### Font: Genesys Glyphs & Dice
> **License:** [MIT](public/assets/fonts/FFG-Genesys-Glyphs-and-Dice/LICENSE)
>
> https://github.com/themensch/FFG-Genesys-Glyphs-and-Dice

#### Font: Genesys Glyphs & Dice (Magical Girl Theme)
> Symbols provided by and used with permission from [MilkMyth](http://MilkMyth.com)!

#### Vue 3
> **License:** [MIT](https://github.com/vuejs/core/blob/main/LICENSE)

## Copyright Disclaimer
This project, and its maintainers, are unaffiliated with EDGE Studios and Fantasy Flight Games. This is an unofficial, third-party system implementation built freely as a hobby project. Additionally, this project is unrelated to Genesys Foundry, EDGE Studios/Fantasy Flight's community content program for the Genesys RPG.

Genesys and its logo, and Genesys Foundry and its logo, are trademarks of Fantasy Flight Games in the U.S.A. and other countries. All Fantasy Flight Games characters and character names, and the distinctive likenesses thereof, are trademarks of Fantasy Flight Games. www.FantasyFlightGames.com.
