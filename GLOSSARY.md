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

**Silhouette**:
An abstract of an actor's size: 0 is smaller than a human, 1 is about human-sized (every character and Adversary starts at 1), and vehicles range from 0 to 10 or more. An attack against a target whose silhouette is two or more points larger than the attacker's is one difficulty easier, and against a target two or more points smaller, one difficulty harder.
_Avoid_: Size, scale

**Critical Injury**:
A lasting harm suffered by an actor, which a vehicle calls a Critical Hit. Its severity, from Easy to Formidable, sets the difficulty of the check that heals it, or that repairs it on a vehicle. A successful attack **triggers** one each time its net Advantage reaches the Critical rating, and once per Triumph; it is rolled on the world's **Critical Injury table**, the Roll Table the GM picks in the settings, with a d100 plus a modifier: +10 per trigger spent past the first, per point of Vicious and per Critical Injury the actor already has, and what talents add.
_Avoid_: Crit, wound

**Recovery**:
What a check that heals gives its **Patient**, the character, rival or nemesis it heals: the wounds and strain its results heal, by the rule it is rolled for, as a Medicine check heals a wound per Success and a strain per Advantage once it succeeds, and the Discipline or Cool check a character makes at the end of an encounter a strain per Success. A full night's rest heals all strain and one wound without a check, and gives no Recovery. Its chat card shows them, and its Apply button lowers the Patient's wounds and strain by them, never below zero, for the GM, the user who rolled the check and the Patient's owners. How often a Patient may receive one is left to the table.
_Avoid_: Heal payload, healing result

**Status Effect**:
A state that hinders an actor during an encounter: Immobilized (no maneuvers), Staggered (no actions) or Disoriented (a Setback die on every check). It lasts for the duration its source gives, or until the end of the actor's next turn when none is given; suffering it again adds to its duration, never beyond the encounter.
_Avoid_: Condition

**Combat Check**:
A check made to attack with a weapon, melee when the weapon's range is engaged and ranged otherwise, as the defense it meets. Pool Modifications can apply to an actor's combat checks only, to their own melee or ranged attacks only, or to the melee or the ranged attacks against them only. Aim, a maneuver of the character's Combat tab, brings a Boost to their next combat check, two after two Aim maneuvers, and that check uses it up once rolled; Guarded Stance brings a Setback to their combat checks and provides melee defense 1, which doesn't stack with the armor's, as a Lapsing Effect of one round.
_Avoid_: Attack roll, combat roll

**Token State**:
A state the system adds to the token's status menu, beside Foundry's own, which puts it on the actor as an Active Effect with the state's name, icon and changes: the three Status Effects, In Cover and Prone, and Incapacitated, a Threshold State. Disoriented carries its Setback as a Pool Modification of every check; Immobilized and Staggered change no dice, and the Dice Prompt reminds the roller of them. A Status Effect is a Lapsing Effect, applied for the rounds the user enters, one by default. In Cover provides ranged defense 1, which doesn't stack with the armor's, the best being kept, and Prone, which takes the place of Foundry's own prone state, brings a Setback to the ranged attacks against the actor and a Boost to the melee ones, and a Setback to the actor's own melee attacks; both stay until removed, and only characters and adversaries have them.
_Avoid_: Condition, status

**Threshold State**:
The state an actor gets while their wounds or strain exceed their threshold, not when they reach it: Incapacitated, a Token State, for a character past either threshold and a nemesis past their strain threshold; Defeated, Foundry's own, which marks the combatant defeated, for a rival or nemesis past their wound threshold. The system sets or clears it when the actor's standing against a threshold changes, whoever changes the wounds or strain, and leaves alone a state the GM sets by hand while the standing stays; a character going past their wound threshold is also offered their Critical Injury in the chat. A threshold of 0 counts as none. A Minion Group has none: it loses its members instead.
_Avoid_: Condition, knocked out

**Lapsing Effect**:
A temporary Active Effect whose duration in rounds counts its actor's turns: the end of its actor's first turn of each round takes a round off, but the turn it was applied during, and it is removed at the end of the turn that takes its last round, so that one round lasts until the end of the actor's next turn. An actor with an Extra Slot, or two Claims in a round, loses one round per round, as any other actor; an effect applied after the actor's first turn of a round counts from their first turn of the next. The actor's turn is the Initiative Slot its combatant Claimed, or for an NPC its own unclaimed slot; an unclaimed PC slot is nobody's turn. A turn the GM goes back to and ends again doesn't count twice. Out of combat, no turn ends, and it stays until removed. Unlike an Expired Effect, it is deleted, not suspended, and Foundry's own count of rounds never applies to it.
_Avoid_: Timed state, countdown effect

**Expired Effect**:
A temporary Active Effect whose duration in rounds or turns has run out. It stops applying but isn't deleted: it stays on its actor or item, suspended, until its duration is extended. Turning an effect off by hand is a different thing: an effect can be expired, turned off, both or neither. A Lapsing Effect never expires: it is removed instead.
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

**Difficulty**:
The Difficulty and Challenge dice a check starts with, before any Pool Modification: a level from Simple (none) to Formidable (five Difficulty dice), some of whose dice may be upgraded into Challenge dice, for skilled opposition, an opposed check or a Story Point. Above Formidable, an Impossible task rolls a Formidable one's dice, once the roller spends a Story Point to attempt it. Boost and Setback dice are not part of it. What asks for the check sets it (a check link, a Critical Injury's severity); when nothing does, the default difficulty of the Skills Compendium's skill rolled (Average for the melee skills), else the world's default difficulty; and the roller can change it in the Dice Prompt. Pool Modifications then apply to it: upgrades and downgrades of the difficulty act on it, and a die removed by hand is removed after them, so removing a die does not lower the difficulty.
_Avoid_: Base difficulty, difficulty modifier

**Pool Modification**:
A change to the dice pool of a check: adding, removing, upgrading or downgrading dice, or adding symbols. The dice prompt lists each one so the roller can turn it on or off. It comes from an effect of the actor or of their target, from the target's defense, from the silhouette difference of an attack, or is entered by hand. An effect comes from one of the actor's or target's items, such as a talent or a piece of equipment, or from the actor itself; the Dice Prompt names that item and opens it, so the roller can read when the effect applies. The Difficulty is not one.
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

**Weapon Profile**:
One way to attack with a weapon: its skills, damage, Critical rating, range and qualities. Every weapon has a main profile, and may have more, such as a dagger that is also thrown. The weapon stays one piece of equipment, whatever its number of profiles: it counts once towards Encumbrance, and has one Equipment State. An attack is made with one of its profiles. A vehicle weapon has a single profile.
_Avoid_: Mode, stat line

**Quality**:
A rule that a weapon or an armor carries, such as Pierce, Disorient or Defensive, with a rating when it's rated. A passive quality always applies; an active one applies only when the attacker triggers it by spending its Advantage cost, two by default. A quality dropped on a weapon or an armor is copied whole, and its Active Effects become the item's own: they apply while the item's do, its rating counts each of their changes once per rank, and they go with the quality. A weapon's quality changes the dice of the attacks made with the Weapon Profile that holds it alone; an armor's, every check its changes name. In the Dice Prompt, an active quality's Pool Modifications start off.
_Avoid_: Trait, property

**Hard Points**:
How many attachments a weapon or an armor can hold: half its base encumbrance, rounded up, and none for an encumbrance of 0 or less (CRB p. 206). The base encumbrance is the stored one, whatever an Item Change does to it. An item that is an exception sets its own number, which wins over the computed one. Attachments that take more than the item has are warned about, never refused. A vehicle weapon has none: a vehicle's own hard points are a vehicle rule.
_Avoid_: Slots, mod slots

**Attachment**:
Equipment installed on a weapon or an armor that takes some of its Hard Points (CRB pp. 206–209). An attachment dropped on a weapon or an armor is copied whole, as a quality is: its Active Effects become the item's own, and go with it. Its enabled effects are its base modifiers; its disabled ones, its modification options, which the table installs by enabling them. On a weapon, its Pool Modifications change the attacks made with any of the weapon's profiles; on an armor, every check they name. The same attachment dropped twice is installed twice. An attachment an actor holds as is changes nothing, nor does a quality.
_Avoid_: Mod, upgrade

**Item Change**:
A change of a weapon's or an armor's own effect that adds its value to the item itself rather than to its actor: damage (`genesys.item.baseDamage`) and Critical rating (`genesys.item.critical`) on every Weapon Profile (a quality's on the profile that holds it alone), defense (`genesys.item.defense`), soak (`genesys.item.soak`), encumbrance (`genesys.item.encumbrance`; a quality held by several profiles once, at its highest rank). The effect sheet lists these keys, marked 🔧; any other `genesys.item.*` key changes nothing. A Critical rating of 0 stays 0. It applies while its effect is enabled, whatever the item's Equipment State. The item's sheet edits the stored values, and shows the changed ones beside them.
_Avoid_: Item override

### Vehicles

**Crew**:
The actors aboard a vehicle: its passengers and the members of its roles. An actor is at most once in a vehicle's crew, but may be in the crew of several vehicles.
_Avoid_: Occupants

**Role**:
A post in a vehicle's crew (pilot, gunner…) with the skills its members roll for the vehicle.
_Avoid_: Station, position

**Pilot Role**:
The Role marked as the one that pilots the vehicle, whatever its name; a vehicle has at most one. Its first member is the **Pilot**, whose Piloted Vehicle Defense, raised by a talent such as Defensive Driving, adds to the vehicle's defense, still up to 4. Without a Pilot Role, or with an empty one, the vehicle has no Pilot.
_Avoid_: Driver, helm

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

### Magic

**Spell**:
A magic action written as an item, which a character owns as they own an ability and casts with a magic skill (CRB pp. 210–219): one of the Core Rulebook's eight actions, or Custom, at a base difficulty, as an attack or not, castable with the magic skills it lists, and with the Additional Effects it holds. Picking an action fills its difficulty, attack flag and skills from the Core Rulebook, which stay editable. A character's sheet lists their spells in its Magic tab, which shows while the character has a rank in a skill of the magic category or owns a spell, unless their window's menu hides it.
_Avoid_: Power, incantation

**Additional Effect**:
An option a spell's caster may add to it, written as an item (Tables III.2–5 to III.2–11): the Difficulty dice it adds, whether it starts checked when the spell is cast, whether it can be added more than once, as Range, which the Dice Prompt then counts in place of a checkbox, and for an attack the qualities it gives, each unrated, at a fixed rating or at the caster's ranks in a skill (Knowledge by default), the Critical rating it gives, and whether it doubles the damage characteristic. Dropped on a spell, it is copied whole, as a quality is on a weapon; the same effect dropped twice is held twice. A quality dropped on it gives its data alone, without its Active Effects.
_Avoid_: Spell effect, modifier

### Table

**Acting GM**:
The one connected GM who writes what a player's client may not, for the whole table: a player's Story Point spend, Claim or Extra Slot initiative, or the Aim used up by an attack a player rolls for an actor they don't own. It is the connected Gamemaster, an Assistant GM only when no Gamemaster is connected, and the one of the lowest id among equals, as Foundry's `game.users.activeGM`.
_Avoid_: Primary GM, GM hub, first GM

**Story Point**:
A point of one of the two pools the whole table shares: the Player pool (« Destin » in the French edition) and the GM pool (« Fatalité »). A session starts with one point per player in the Player pool and one in the GM pool, and a point spent from one pool goes to the other. From the Dice Prompt, the roller spends one point of their own pool to upgrade the ability of a check once, and one to attempt an Impossible task; a GM also spends a player's point to upgrade the difficulty of an NPC's check against their character.
_Avoid_: Destiny Point, narrative point

### Presentation

**Palette**:
The set of colors the system draws with, exposed as `--genesys-<name>` CSS custom properties that worlds and modules may override. The names published before 0.6.0 describe the Genesys color they started from (blue, gold, paper…); the names added since name a role (ink, text-blue, field…). Each keeps its meaning whatever the Style, and its color unless a Style overrides it: a color whose role changes gets a new name rather than a new value.
_Avoid_: Theme, color scheme

**Style**:
The palette variant chosen by the GM in the world settings ("Genesys" by default, or "Realms of Terrinoth"). A Style only changes colors, never the sheets' layout.
_Avoid_: Theme, skin
