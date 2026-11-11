# Focused Command Collision Audit

## /pet
Scoped to:
- Pet Families and Abilities
- Pet Fundamentals
- Pet Stat Mechanics
- Pet Attack Formulas

Global fallback disabled.

This prevents collisions such as:
- raptor -> Raptor Strike
- growl -> unrelated Hunter ability text
- focus -> unrelated focus references elsewhere
- armor -> Hunter Stat Mechanics instead of Pet Stat Mechanics

## /range
Scoped to:
- Anatomy of Range Checks
- Shot Mechanics
- Melee Weaving

Global fallback disabled.

This prevents collisions such as:
- dead zone -> unrelated range mentions
- combat reach -> unrelated ability mechanics
- melee range -> melee ability pages
- minimum range -> generic weapon text

## /formula
Scoped to:
- Attack Formulas
- Pet Attack Formulas
- Shot Mechanics
- Stat Mechanics
- Ability Mechanics

Global fallback remains enabled because formulas and formula-like rules may legitimately
live outside the primary formula pages.

Potential ambiguous terms still intentionally resolved by heading-first matching:
- auto shot
- aimed shot
- serpent sting
- pet auto
- crit
- armor
- hit

## Matching behavior
Focused commands use:
1. scoped heading match
2. scoped full-text match
3. optional global fallback

`/pet` and `/range` stop after step 2.
`/formula` may continue globally.
