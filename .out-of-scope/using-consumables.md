# Using a consumable

The system has no way to use a consumable: no "Use" action that spends one and applies its effects. A consumable's Active Effects never apply to the actor holding it, and the Equipment State has no Used state (it was dropped in #205: nothing could set it).

## Why this is out of scope

In the Core Rulebook, a consumable has a one-off effect resolved when it is used, then it is spent: painkillers heal wounds (p. 94, p. 116), herbs of healing add results to a Medicine check and are consumed. The table resolves that effect itself, as it would any other one-off result: healing wounds, adding a die. An ongoing modifier, which is what an Active Effect is, doesn't model it.

Using a consumable in the system would need:

-   an action on the inventory row that spends one of its quantity, and deletes the item at 0;
-   a copy of its effects onto the actor, since an item's effects stay on the item (#102), with a duration and its expiry on rounds or turns;
-   a way to undo a use made by mistake, and the same for vehicles;
-   tests for each of these on Foundry v12 and v13.

That is a feature of its own, for a need no one has expressed: the Used state existed since 2024 with no way to reach it, and no one reported it.

## When to reconsider

This is deferred rather than refused: if a table asks for consumables that apply their effects (a buff potion, a stimpack's bonus), open an issue linking this file. The design would start from the list above.

## Prior requests

-   #205: "A consumable's effects never apply: nothing sets the Used state"
