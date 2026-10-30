# Genesys for Foundry VTT

An unofficial implementation of the Genesys RPG rules as a Foundry VTT game system.

## Language

### Rules

**Core Rulebook**:
The Genesys Core Rulebook published by Fantasy Flight Games in 2017: the authority for the rules the system implements.
_Avoid_: CRB in player-facing text, the PDF

**Alternate Rule**:
An optional rule the Core Rulebook itself offers, such as Uncoupling Skills from Characteristics, Nemesis Extra Activation or Super-characteristics.
_Avoid_: House rule, variant

**House Rule**:
A deliberate departure from the Core Rulebook, either turned on by the GM in the world settings or adopted by the system by default.
_Avoid_: Alternate rule, variant

### Combat

**Combatant**:
An actor taking part in an encounter, as listed in the combat tracker.
_Avoid_: Participant, token

**Initiative Slot**:
A position in the turn order belonging to a side (PC or NPC), not to a specific combatant. A combatant gives slots of its side: a combatant whose actor a player owns is a PC, any other is an NPC, whatever its token's disposition.
_Avoid_: Turn, initiative entry

**Extra Slot**:
An Initiative Slot added for a combatant from a given round on, on top of its own. Its initiative is rolled by its combatant, and it belongs to that combatant's side.
_Avoid_: Extra activation, additional turn

**Claim**:
The act of a combatant taking an unoccupied Initiative Slot of its own side for the current round.
_Avoid_: Take, assign

**Initiative Skill**:
A skill flagged as usable for rolling initiative (Cool and Vigilance by default). Each combatant rolls with one chosen Initiative Skill; when none is chosen, it rolls Vigilance, or the first Initiative Skill of the Skills Compendium when none is named Vigilance.
_Avoid_: Initiative type, initiative stat

**Attack Skill**:
The skill an actor rolls to attack with a weapon, among the skills the weapon lists. The actor may choose one for each of their weapons; when none is chosen, they roll the listed skill they have the highest rank in, then the first the weapon lists, as an Unranked Skill Check if they have none of them.
_Avoid_: Weapon skill, combat skill

**Critical Injury**:
A lasting harm suffered by an actor, which a vehicle calls a Critical Hit. Its severity, from Easy to Formidable, sets the difficulty of the check that heals it, or that repairs it on a vehicle.
_Avoid_: Crit, wound

**Expired Effect**:
A temporary Active Effect whose duration in rounds or turns has run out. It stops applying but isn't deleted: it stays on its actor or item, suspended, until its duration is extended. Turning an effect off by hand is a different thing: an effect can be expired, turned off, both or neither.
_Avoid_: Finished effect, ended effect

### Skills

**Skills Compendium**:
The compendium, chosen in the world settings, that defines the list of skills available in the world.
_Avoid_: Skill pack, skill list

**Unranked Skill Check**:
A check of a skill the actor doesn't have, though the Skills Compendium defines it: the dice pool comes from the skill's linked characteristic alone, but it remains a check of that skill, and Pool Modifications for that skill apply. Any actor can make one; adversaries make them most, since they only list skills they have ranks in. Skill names match whatever their case.
_Avoid_: Unskilled check

**Characteristic Check**:
A check that uses a characteristic alone, with no skill involved at all.
_Avoid_: Unskilled check, raw roll

**Super-characteristic**:
A characteristic marked as super, under the optional rule the world settings turn on: the Proficiency dice of a check that uses it explode. A character marks or unmarks super-characteristics only during Character Creation; an Adversary at any time.
_Avoid_: Super stat

**Pool Modification**:
A change to the dice pool of a check: adding, removing, upgrading or downgrading dice, or adding symbols. The dice prompt lists each one so the roller can turn it on or off. It comes from an effect on the actor or on their target, from the target's defense, or is entered by hand.
_Avoid_: Dice modifier, pool mod

**Dice Roller**:
The Dice Prompt opened from the `/gendr` chat command or the chat's dice button: for the actor of the single controlled token, or bare, without an actor, when no token is controlled.
_Avoid_: Free roll, generic roll

### Advancement

**Advancement**:
Spending XP to raise a characteristic, to buy a rank of a skill, or to buy a talent or a rank of one. Every Advancement is recorded in the character's Experience Journal, and can be undone from it.
_Avoid_: Purchase, upgrade, level-up

**Experience Journal**:
The ordered record of a character's XP awards and Advancements.
_Avoid_: XP log, history

**Character Creation**:
The period before a character receives their first XP award. Characteristics can only be raised, and super-characteristics only marked or unmarked, during Character Creation, and a skill rank bought during it can't go above 2.
_Avoid_: Creation phase, chargen

**Free Rank**:
A skill rank gained or lost without spending XP: granted by the archetype or the career, or given or taken by hand, for instance for a talent or by the GM. A Free Rank is not an Advancement and is not recorded in the Experience Journal; a skill's rank never goes below 0.
_Avoid_: Bonus rank, manual rank

### Equipment

**Equipment State**:
Where a piece of a character's or vehicle's equipment is: Equipped, Carried or Dropped. The effects of equipment that can be equipped (a character's weapons and armor, a vehicle's vehicle weapons) apply only while it's Equipped and held in no container, and of any other equipment only while it's Carried, but a consumable's effects never apply, whatever its state: the system has no way to use one ([out of scope for now](.out-of-scope/using-consumables.md)). Adversaries have no Equipment State: the effects of their equipment always apply, consumables included.
_Avoid_: Inventory category, equipment status

**Container**:
A piece of equipment that holds other equipment. Its contents always share its Equipment State, go wherever it goes and are deleted with it. Equipment that can be equipped is put away in a container: its effects never apply, whatever the container's state. A container can't hold another container.
_Avoid_: Bag, pack

**Worn Armor**:
The armor a character wears: Equipped and held in no container. A character wears one armor: equipping an armor puts the one worn before back to Carried. When older data still has several worn, only the one with the best soak, then the best defense, then the first in item order adds its soak and defense. An armor in a container never adds soak or defense, whatever the container's state.
_Avoid_: Active armor, armor in use

**Encumbrance**:
The total encumbrance of a character's or vehicle's equipment (its value), against the threshold above which they are encumbered. Each item adds its encumbrance to the value once per item of its quantity; an item with a negative encumbrance raises the threshold instead, also once per item. On a character, Dropped equipment, including the contents of a Dropped container, counts towards neither the value nor the threshold, and an Equipped armor counts 3 less, to a minimum of 0, for one of its quantity. On a vehicle, all equipment counts, whatever its Equipment State.
_Avoid_: Weight, load

### Vehicles

**Crew**:
The actors aboard a vehicle: its passengers and the members of its roles. An actor is at most once in a vehicle's crew, but may be in the crew of several vehicles.
_Avoid_: Occupants

**Role**:
A post in a vehicle's crew (pilot, gunner…) with the skills its members roll for the vehicle.
_Avoid_: Station, position

### Adversaries

**Adversary**:
A character the GM runs against the players with a stat block of its own: a Minion Group, a rival or a nemesis.
_Avoid_: Enemy

**Minion Group**:
Identical minions acting as one Adversary. Its members share one wound threshold, and the group's is theirs times its group size. A member falls each time the group's wounds exceed another member's threshold, not when they reach it; with a threshold of 0, no member stands. The group rolls every skill at its group skill rank: one per remaining member beyond the first, up to 5.
_Avoid_: Squad

### Talents

**Ability**:
A special ability of a character or an Adversary, distinct from their talents: it has no rank and no tier, costs no XP and doesn't count in the Talent Pyramid. A character gets abilities from their archetype, for as long as they keep it, or by hand; an Adversary's are part of its stat block. The character sheet calls it a Special Ability; it has nothing to do with the Ability die.

**Talent Pyramid**:
The rule that a character must have more talents at each tier than at the tier above it. A ranked talent counts once at each tier its ranks have reached, and every rank bought at tier 5 counts at tier 5.

### Table

**Acting GM**:
The one connected GM who writes what a player's client may not, for the whole table: a player's Story Point spend, Claim or Extra Slot initiative. It is the connected Gamemaster, an Assistant GM only when no Gamemaster is connected, and the one of the lowest id among equals, as Foundry's `game.users.activeGM`.
_Avoid_: Primary GM, GM hub, first GM

### Presentation

**Palette**:
The set of colors the system draws with, exposed as `--genesys-<name>` CSS custom properties that worlds and modules may override. Names describe the Genesys color they started from, not a role, and stay stable whatever the Style.
_Avoid_: Theme, color scheme

**Style**:
The palette variant chosen by the GM in the world settings ("Genesys" by default, or "Realms of Terrinoth"). A Style only changes colors, never the sheets' layout.
_Avoid_: Theme, skin
