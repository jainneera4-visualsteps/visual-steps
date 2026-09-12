# Visual Steps Form Design Standard

This is the default standard for every new form and for each existing form when that form is next changed. Existing forms are migrated deliberately, one at a time; this rule does not authorize a bulk visual rewrite or changes to established behavior.

## Required layout

1. Put the form's title at the top left.
2. Put **Cancel** and the primary **Save**, **Create**, **Add**, or **Send** action at the top right.
3. Show the fields needed for the form's main purpose first.
4. Keep additional and advanced settings visible, but present them as compact rows with the label on the left and controls on the right when screen width allows.
5. Place dependent controls directly after the field that activates them. Show them only when they are relevant.
6. Use short help-circle tooltips for unfamiliar choices instead of permanent paragraphs or large instructional panels.
7. Keep validation messages close to the affected field and provide a concise form-level error when necessary.

## Interaction requirements

- Do not hide ordinary choices behind multiple accordions, menus, or dialogs merely to reduce height.
- Do not use large colored cards for a single checkbox, radio group, or short setting.
- Preserve keyboard access, visible focus, readable labels, and sufficiently large touch targets.
- On narrow screens, allow each compact row to stack its label above its controls without changing field order.
- Keep destructive actions visually separate from the primary save action.
- Do not let a floating action bar cover fields, messages, or mobile browser controls.
- Preserve the form's data, validation, permissions, guided-tour targets, and server behavior during layout standardization.

## Basic versus advanced fields

A basic field is necessary to understand or create the form's main object. Basic fields appear before configuration details. For an activity, these include its category, name, description, visual image, and steps.

An advanced field changes how the object is offered, scheduled, reviewed, repeated, rewarded, shared, or administered. Advanced fields remain easy to find but use compact presentation. A field is not advanced merely because its implementation is technically complex.

## Standardization process

When an existing form is changed:

1. Identify its basic and advanced fields without changing their meaning.
2. Apply this layout only to that form or the explicitly approved form group.
3. Preserve all existing values and workflows.
4. Update relevant tooltips, tours, tests, and parent-facing documentation.
5. Verify desktop and narrow-screen behavior before considering the form standardized.

Exceptions are appropriate for editors, previews, multi-step generators, and other experiences where this layout would make the primary task less clear. Any exception should preserve the same goals: immediate access to the main task, compact supporting controls, and actions that are easy to find.
