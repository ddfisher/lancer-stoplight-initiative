# Stoplight Initiative Tracker

A FoundryVTT v12 module that provides an alternative initiative tracker for popcorn-style initiative games. Designed for the Lancer combat system, it integrates with Lancer's activation mechanics while providing an intuitive visual interface for managing turn order.

Vibe coded. Use at your own risk.

## Features

### Three-Zone Initiative System
The tracker displays three color-coded zones:
- **Green (Want to Go)**: Players drag themselves here to volunteer for the next turn
- **Yellow (Waiting)**: Default state for players who haven't acted and haven't volunteered
- **Red (Already Acted)**: Automatically populated when players have exhausted their activations

### Drag and Drop Interface
- Players can drag their own combatant between zones
- GMs can drag any combatant to any zone
- Dragging to red consumes all remaining activations
- Dragging from red restores activations
- Visual feedback during drag operations

### Lancer Integration
- Reads and modifies Lancer activation states (`activations.value`)
- Uses `wantsToGo` flags to track green zone volunteers per round
- GMs can double-click any combatant to activate their turn
- Automatically resets state each new round
- Only displays friendly combatants (player characters)

### Custom UI
- Compact, non-intrusive window with custom drag handle
- Minimizable with toggle button (collapses to just controls)
- Fixed-size zones that accommodate up to 4 combatants each (scrollable if more)
- Visual indicator for the currently active combatant (green border)
- Automatic show/hide based on combat state

## Usage

### For Players
1. When combat starts, the tracker appears automatically
2. Drag your character to the **green zone** when you want to go next
3. The GM will typically choose from characters in the green zone
4. Your character moves to **red** automatically when your turn ends
5. At the start of each round, all characters reset to yellow

### For GMs
1. The tracker opens automatically when you start combat
2. Choose the next combatant (typically from the green zone)
3. Double-click any combatant to start their turn
4. Drag combatants between zones to manually adjust their status
5. Drag to red to mark as "already acted" (consumes activations)
6. Drag from red to restore a combatant's activations
7. Click the minimize button to collapse the tracker when not needed
8. Use the drag handle to reposition the tracker window

## Installation

1. Copy the module folder to your Foundry modules directory
2. Enable "Stoplight Initiative" in your world's module settings
3. Requires FoundryVTT v12 and the Lancer system

## Technical Architecture

### Key Files
- `module.json` - Module manifest with FoundryVTT v12 compatibility
- `stoplight-initiative.mjs` - Main module script containing both UI class and hook logic
- `templates/stoplight-initiative.hbs` - Handlebars template for tracker UI
- `styles/stoplight-initiative.css` - All styling for the tracker

### Implementation Details

**StoplightTrackerUI Class** extends Foundry's `Application` class:
- `populateFromCombat()` - Reads combatant states and sorts into zones
- `_moveCombatantToZone()` - Handles drag/drop by modifying Lancer activation states
- `_canDragCombatant()` - Permission checks (players can only drag themselves)
- Custom drag handle implementation for window repositioning
- Minimizable state that persists across re-renders

**State Management**:
- Uses individual combatant flags (`flags.stoplight-initiative.wantsToGo`)
- Integrates with Lancer activation system (`flags.lancer.activations`)
- No combat-level state - all state derived from combatant properties
- `wantsToGo` stores round number (auto-resets each round)

**Synchronization**:
All state changes are made through Foundry's document update system, which automatically synchronizes across all connected clients via websockets. No custom socket implementation needed.

### Foundry Hooks Used
- `init` - Module initialization
- `ready` - Create tracker instance, show if combat active
- `updateCombat` - Detect combat start/end, round/turn changes
- `deleteCombat` - Close tracker when combat deleted
- `createCombatant` - Refresh tracker when combatant added
- `deleteCombatant` - Refresh tracker when combatant removed
- `updateCombatant` - Sync when combatant flags or activations change

### Data Flow
1. User drags combatant to new zone
2. `_moveCombatantToZone()` updates combatant flags/activations
3. Foundry's document system broadcasts update to all clients
4. `updateCombatant` hook fires on all clients
5. All clients call `populateFromCombat()` and re-render
6. State persists in combatant documents for page refreshes

## Development Notes

This is hobby software focused on functionality over robustness. Error handling is basic but sufficient for typical use cases. No automated tests - manual testing during development ensures core functionality works.
