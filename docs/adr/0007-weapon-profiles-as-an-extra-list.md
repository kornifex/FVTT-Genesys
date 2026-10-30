# A weapon's extra profiles are a list beside its main profile

A weapon can be used in more than one way, such as a dagger that is also thrown (Realms of Terrinoth pp. 92–96, #366). We keep a weapon's existing fields (skills, damage, Critical rating, range, qualities, Attack Skill) as its main Weapon Profile, and add a list of extra profiles beside them, rather than moving every profile into one `profiles` list. Existing weapons, compendiums and modules reading those fields keep working unchanged, with no migration: a weapon without extra profiles is exactly what it was. Code that lists a weapon's profiles reads the main one, then the list.

## Considered options

-   **One `profiles` list holding every profile, the main one first.** A uniform model, but it needs a migration of every weapon in worlds and compendiums, and breaks whatever reads `system.baseDamage`, `system.range` and the other fields today.
-   **A fixed second profile.** Covers every weapon of the Core Rulebook and Realms of Terrinoth, but is no simpler than a list, and needs a "has a second profile" switch.
