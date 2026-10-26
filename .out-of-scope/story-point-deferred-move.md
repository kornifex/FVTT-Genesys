# Deferred move of a spent Story Point

The Story Point Tracker moves a spent Story Point to the other pool as soon as it is clicked. It does not hold the point apart until the action it was spent on is resolved.

## Why this is out of scope

The Core Rulebook (p. 28) says a spent Story Point reaches the other pool only once the action is resolved, so the other side can't spend it back during that same action. The tracker leaves that timing to the table: a player or the GM clicks the point when they spend it, and the other side waits for the action to end before spending it back.

Deferring the move in the system would need a moment that marks an action as resolved, and the system has none. A Story Point isn't only spent on checks: it can also introduce a fact or a detail into the story (p. 28), which no roll or chat message follows. Any trigger would be invented:

-   a "resolve" button the GM clicks after each spend, which adds a step to every spend;
-   the next check posted to chat, which is wrong for narrative spends and for checks rolled by the other side in the same action.

Either one also needs a new persisted state (the pending point), its display in the tracker, and another round trip over the socket, for a rule the table already applies by itself.

## Prior requests

-   #156: "Rules Discrepancy: a spent Story Point reaches the other pool before the action is resolved"
