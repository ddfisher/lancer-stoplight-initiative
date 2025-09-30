# Stoplight Initiative Tracker

A FoundryVTT v12 module that provides an alternative initiative tracker for popcorn-style initiative games.

## Concept

The tracker displays three colored zones (like a stoplight):
- **Green**: "I want to go next" - players drag themselves here to volunteer
- **Yellow**: "I don't care" - default state for players each round
- **Red**: "I've already gone" - automatic after a player's turn ends

## Implementation Plan

### Phase 1: Module Setup
1. Create `module.json` manifest with required metadata
2. Set up basic directory structure (scripts, styles, templates)
3. Create main module script with hook registration

### Phase 2: Core UI Development
1. Create HTML template for the stoplight tracker UI
   - Three distinct zones (green, yellow, red)
   - Each zone displays player tokens/names
2. Style the tracker with CSS
   - Color-coded zones with visual distinction
   - Responsive layout that doesn't obstruct gameplay
3. Implement UI positioning and toggling
   - Allow GMs and players to show/hide the tracker
   - Position in a non-intrusive screen location

### Phase 3: Initiative Integration
1. Hook into Foundry's combat tracker
   - Detect when a combat round starts ’ reset all to yellow
   - Detect when a turn ends ’ move that player to red
2. Populate tracker with combatants from active combat
3. Handle edge cases:
   - Combat starting/ending
   - Players joining mid-combat

### Phase 4: Drag and Drop Functionality
1. Make player entries draggable within the tracker
2. Implement drop zones for green and yellow areas
   - Players can only move themselves (not others)
   - GMs can move anyone
3. Add visual feedback during drag operations

### Phase 5: Polish and UX
1. Implement visual indicators for whose turn it is
2. Make the zones a fixed size
3. Make icons slightly bigger. Make the names slightly smaller and move them to under the icons.
4. Display combatants left to right instead of vertically.
5. Re-title "Ready to Go" to "Want to Go"
6. Only show tokens with "Friendly" disposition in the tracker.

### Phase 6: Synchronization
1. Discuss a plan for synchronization and fill in this section.

### Phase 7: Final Features
1. Allow GMs to double-click on a mech to start their turn.
2. Allow GMs to drag mechs to and from "already acted" to modify whether or not they've gone this combat round.
3. There's a lot of excess vertical space that's not being used. Can we make this not a normal window and instead give it a small drag handle to be repositioned?

## Technical Architecture

### Key Files
- `module.json` - Module manifest
- `scripts/stoplight-initiative.js` - Main module logic
- `scripts/tracker-ui.js` - UI rendering and interaction
- `scripts/combat-integration.js` - Combat tracker hooks
- `templates/tracker.hbs` - Handlebars template for tracker UI
- `styles/stoplight.css` - Tracker styling

### Key Hooks
- `init` - Register settings and initialize module
- `ready` - Render UI, set up socket listeners
- `renderCombatTracker` - Sync with native combat tracker
- `updateCombat` - Detect round changes
- `combatTurn` - Detect turn changes and auto-move to red

### Data Flow
1. Player drags token between zones ’ triggers update
2. Update broadcasts via socket to all clients
3. All clients re-render tracker with new state
4. State persists in combat flags for page refreshes

## Development Notes

This is hobby software focused on functionality over robustness. Error handling will be basic but sufficient. No automated tests planned - manual testing during development will ensure core functionality works.
