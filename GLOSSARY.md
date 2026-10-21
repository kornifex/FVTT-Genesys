# Genesys for Foundry VTT

An unofficial implementation of the Genesys RPG rules as a Foundry VTT game system.

## Language

### Combat

**Combatant**:
An actor taking part in an encounter, as listed in the combat tracker.
_Avoid_: Participant, token

**Initiative Slot**:
A position in the turn order belonging to a side (PC or NPC), not to a specific combatant.
_Avoid_: Turn, initiative entry

**Claim**:
The act of a combatant taking an unoccupied Initiative Slot of its own side for the current round.
_Avoid_: Take, assign

**Initiative Skill**:
A skill flagged as usable for rolling initiative (Cool and Vigilance by default). Each combatant rolls with one chosen Initiative Skill; when none is chosen, the first Initiative Skill of the Skills Compendium is used.
_Avoid_: Initiative type, initiative stat

### Skills

**Skills Compendium**:
The compendium, chosen in the world settings, that defines the list of skills available in the world.
_Avoid_: Skill pack, skill list

**Unranked Skill Check**:
A check of a skill in which the actor has no ranks: the dice pool comes from the skill's linked characteristic alone, but it remains a check of that skill. Adversaries only list skills they have ranks in, so any other skill they roll is an Unranked Skill Check.
_Avoid_: Unskilled check

**Characteristic Check**:
A check that uses a characteristic alone, with no skill involved at all.
_Avoid_: Unskilled check, raw roll

### Talents

**Talent Pyramid**:
The rule that a character must have more talents at each tier than at the tier above it. A ranked talent counts once at each tier its ranks have reached.

### Presentation

**Palette**:
The set of colors the system draws with, exposed as `--genesys-<name>` CSS custom properties that worlds and modules may override. Names describe the Genesys color they started from, not a role, and stay stable whatever the Style.
_Avoid_: Theme, color scheme

**Style**:
The palette variant chosen by the GM in the world settings ("Genesys" by default, or "Realms of Terrinoth"). A Style only changes colors, never the sheets' layout.
_Avoid_: Theme, skin
