# Visual Steps Navigation Design Standard

This standard keeps the parent experience compact and predictable as Visual Steps grows. It preserves the application’s friendly colors, rounded forms, supportive wording, and learner-specific personality. It does not authorize a bulk rewrite of established screens; each workspace is standardized when it is next changed.

## Three stable levels

1. **Product navigation** contains only stable destinations such as Dashboard, Activities, Learning, Communication, Progress, and Support.
2. **Workspace navigation** contains a small set of broad choices for the selected person or product area. Aim for four to six choices and group related features rather than adding a new pill for every feature.
3. **View controls** affect only the current screen, such as List / Calendar, search, category, sort, and filters. They must not look like product navigation.

Only the selected workspace’s secondary choices are shown. Parents should never have to scan every status, report, and setting at the same time.

## Placement rules

- A learner card may provide compact entry pills for Activities, Needs Attention, Progress, and Rewards.
- Attention counts belong beside Needs Attention and use color only when action is genuinely required.
- Workspace navigation appears near the page title. Its related secondary choices appear directly beneath it.
- Primary creation actions such as Add Activity stay in the relevant workspace instead of filling the dashboard.
- On narrow screens, a short group of pills wraps into additional rows. Do not require horizontal scrolling to discover an important destination.

## Growth rules

Before adding navigation for a feature, assign it to an existing workspace. Help, postponement, alternatives, and verification belong under Needs Attention. Quizzes, worksheets, stories, samples, and games belong under Learning. Results and history belong under Progress. Create a new primary destination only when the feature cannot be understood inside an existing area.

Navigation labels, icons, routes, counts, permissions, and group membership should use shared components or configuration as workspaces are standardized. Do not duplicate a different navigation pattern on each page.

## Visual and accessibility rules

- Keep the selected item unmistakable and keep inactive items quieter.
- Use one icon per item, short labels, visible keyboard focus, `aria-label` on navigation groups, and `aria-current` or `aria-pressed` where appropriate.
- Preserve comfortable touch targets even when the design is visually compact.
- Use whitespace between meaningful groups, not large empty panels.
- Parent workspaces may be information-dense; learner screens must retain larger controls and simpler choices.
- Preserve Visual Steps theme accents and warm language. Compact must not mean clinical, crowded, or visually flat.

## Back navigation

- Page-level **Back to Dashboard** and **Back to List** controls stay in the upper-left page header, immediately before the page title.
- Use one compact treatment: a left arrow, 12px bold uppercase label, 28px control height, and no filled background.
- Form Save and Cancel actions remain in the upper-right card header; back navigation does not move into that action group.
- Do not add a second back control elsewhere on the same page.

## Standardization process

When a workspace is changed, first preserve all routes, permissions, guided-tour targets, counts, and stored data. Group existing destinations into the three levels, test direct links to each view, verify desktop and mobile wrapping, update parent-facing documentation, and only then consider that workspace standardized.
