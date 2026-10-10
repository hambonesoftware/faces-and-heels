# Touch-First UX Direction

## Approved preference from conversation

The user rejected the earlier busy dashboard direction and responded positively to the simplified version. Treat the simplified concept image in `05_VISUAL_DIRECTION/03_clean_match_ui_concept.png` as the current UX reference, while recognizing that generated concept art is illustrative rather than a pixel-perfect specification.

## Core rule

The match screen should answer four questions instantly:

1. Whose turn is it?
2. What condition are the wrestlers in?
3. Where / in what position are they?
4. What can I do now?

## Persistent UI

Keep visible:

- wrestler names;
- stamina bar/value;
- Pop or Heat indicator;
- small condition label;
- current position when relevant;
- ring scene;
- turn/momentum banner;
- 3–5 large action buttons.

## Contextual UI

Hide behind taps/sheets:

- full body-part diagram;
- exact body-point marks;
- detailed roll history;
- move encyclopedia text;
- progression details;
- full character sheet;
- complete match log.

## Phone orientation

### Landscape match mode

Preferred for active matches because it provides enough width for two wrestler status areas and a ring.

### Portrait support

Use for:

- wrestler creation;
- move book;
- character sheet;
- promos;
- campaign screens;
- settings;
- match history.

A portrait match fallback can stack opponent status, ring, and action bar vertically if required.

## Touch targets

Design for finger use, not mouse precision:

- primary buttons roughly 44 CSS px or larger;
- no hover-only information;
- swipe should not be required for critical actions;
- safe-area insets for iPhone notches / home indicator;
- bottom sheets should be reachable by thumb;
- destructive or irreversible choices need clear confirmation.

## Accessibility

- do not encode body damage only by color;
- allow reduced-motion mode;
- scalable text;
- high-contrast mode where practical;
- labels on icons;
- animation may be skipped without changing match state.
