/**
 * Stoplight Initiative - Main Module Script
 * Provides a color-coded initiative tracker for popcorn-style games
 */

const MODULE_ID = 'stoplight-initiative';

// Global tracker instance
let tracker = null;


/**
 * Stoplight Initiative Tracker UI
 * Extends Foundry's Application class to create a custom UI window
 */
export class StoplightTrackerUI extends Application {
  constructor(options = {}) {
    super(options);

    // Initialize state data structure
    this.trackerData = {
      green: [],   // Players who want to go next
      yellow: [],  // Players in neutral state
      red: []      // Players who have already acted
    };
  }

  /**
   * Define default Application options
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'stoplight-tracker',
      title: 'Stoplight Initiative',
      template: 'modules/stoplight-initiative/templates/stoplight-initiative.hbs',
      width: 300,
      height: 'auto',
      resizable: true,
      minimizable: false,
      closeOnEscape: false,
      classes: ['stoplight-initiative-app']
    });
  }

  /**
   * Provide data to the Handlebars template
   */
  getData(options = {}) {
    return {
      green: this.trackerData.green,
      yellow: this.trackerData.yellow,
      red: this.trackerData.red
    };
  }

  /**
   * Activate event listeners after rendering
   */
  activateListeners(html) {
    super.activateListeners(html);

    // Toggle tracker visibility
    html.find('.toggle-tracker').click(() => {
      this.close();
    });

    // Drag and drop listeners will be added in Phase 4
  }

  /**
   * Update tracker data and re-render
   */
  updateTracker(data) {
    this.trackerData = foundry.utils.mergeObject(this.trackerData, data);
    this.render(false);
  }

  /**
   * Populate tracker from combat encounter
   * Loads state from combat flags if available, otherwise puts everyone in yellow
   */
  populateFromCombat(combat) {
    if (!combat) {
      this.trackerData = { green: [], yellow: [], red: [] };
      this.render(false);
      return;
    }

    console.log(`${MODULE_ID} | Populating from combat:`, combat);
    console.log(`${MODULE_ID} | Combatants collection:`, combat.combatants);
    console.log(`${MODULE_ID} | Combatants size:`, combat.combatants.size);

    // Get all combatants and convert to our format
    // In Foundry v12, combatants is a Collection
    const combatants = Array.from(combat.combatants).map(c => ({
      id: c.id,
      name: c.name,
      img: c.img || c.actor?.img || 'icons/svg/mystery-man.svg',
      actorId: c.actorId,
      tokenId: c.tokenId
    }));

    console.log(`${MODULE_ID} | Processed combatants:`, combatants);

    // Try to load saved state from combat flags
    const savedState = combat.getFlag(MODULE_ID, 'trackerState');

    if (savedState) {
      // Restore saved state, but ensure all combatants are accounted for
      this.trackerData = this._mergeCombatantsWithState(combatants, savedState);
    } else {
      // Start everyone in yellow (neutral) state
      this.trackerData = {
        green: [],
        yellow: combatants,
        red: []
      };
    }

    this.render(false);
  }

  /**
   * Merge current combatants with saved state
   * Handles cases where combatants were added/removed mid-combat
   */
  _mergeCombatantsWithState(combatants, savedState) {
    const result = { green: [], yellow: [], red: [] };
    const combatantIds = new Set(combatants.map(c => c.id));

    // Restore combatants that still exist in the combat
    ['green', 'yellow', 'red'].forEach(zone => {
      if (savedState[zone]) {
        savedState[zone].forEach(saved => {
          if (combatantIds.has(saved.id)) {
            const current = combatants.find(c => c.id === saved.id);
            result[zone].push(current);
            combatantIds.delete(saved.id);
          }
        });
      }
    });

    // Add any new combatants to yellow zone
    combatantIds.forEach(id => {
      const combatant = combatants.find(c => c.id === id);
      if (combatant) {
        result.yellow.push(combatant);
      }
    });

    return result;
  }

  /**
   * Save tracker state to combat flags
   */
  async saveState(combat) {
    if (!combat) return;

    await combat.setFlag(MODULE_ID, 'trackerState', {
      green: this.trackerData.green,
      yellow: this.trackerData.yellow,
      red: this.trackerData.red
    });
  }

  /**
   * Reset all combatants to yellow zone (start of new round)
   */
  async resetForNewRound(combat) {
    const allCombatants = [
      ...this.trackerData.green,
      ...this.trackerData.yellow,
      ...this.trackerData.red
    ];

    this.trackerData = {
      green: [],
      yellow: allCombatants,
      red: []
    };

    this.render(false);

    // Save state to combat flags
    if (combat) {
      await this.saveState(combat);
    }
  }

  /**
   * Move a combatant to the red zone (after their turn)
   */
  async moveCombatantToRed(combatantId, combat) {
    // Find the combatant in green or yellow
    let combatant = this.trackerData.green.find(c => c.id === combatantId);
    if (combatant) {
      this.trackerData.green = this.trackerData.green.filter(c => c.id !== combatantId);
    } else {
      combatant = this.trackerData.yellow.find(c => c.id === combatantId);
      if (combatant) {
        this.trackerData.yellow = this.trackerData.yellow.filter(c => c.id !== combatantId);
      }
    }

    // Add to red if found
    if (combatant && !this.trackerData.red.find(c => c.id === combatantId)) {
      this.trackerData.red.push(combatant);
      this.render(false);

      // Save state to combat flags
      if (combat) {
        await this.saveState(combat);
      }
    }
  }
}

/**
 * Initialize module on Foundry init hook
 */
Hooks.once('init', async function() {
  console.log(`${MODULE_ID} | Initializing Stoplight Initiative module`);

  // Register module settings here (Phase 6)
  // game.settings.register(MODULE_ID, ...);
});

/**
 * Set up module when Foundry is ready
 */
Hooks.once('ready', async function() {
  console.log(`${MODULE_ID} | Stoplight Initiative module ready`);

  // Create tracker UI instance
  tracker = new StoplightTrackerUI();

  // If there's an active combat, populate the tracker
  if (game.combat) {
    tracker.populateFromCombat(game.combat);
    tracker.render(true);
  }

  // Make tracker globally accessible for debugging and API
  game.modules.get(MODULE_ID).tracker = tracker;

  console.log(`${MODULE_ID} | Tracker UI initialized`);
});

/**
 * Handle combat round changes
 * Reset all combatants to yellow at the start of each new round
 */
Hooks.on('combatRound', async function(combat, updateData, updateOptions) {
  if (!tracker) return;

  console.log(`${MODULE_ID} | New round started: ${updateData.round}`);

  // Reset all combatants to yellow zone
  await tracker.resetForNewRound(combat);
});

/**
 * Handle combat turn changes
 * Move the combatant whose turn is ending to the red zone
 */
Hooks.on('combatTurn', async function(combat, updateData, updateOptions) {
  if (!tracker) return;

  // Get the combatant whose turn is ending (current turn before the update)
  const endingCombatant = combat.turns[combat.turn];

  if (endingCombatant) {
    console.log(`${MODULE_ID} | Turn ending for: ${endingCombatant.name}`);
    await tracker.moveCombatantToRed(endingCombatant.id, combat);
  }
});

/**
 * Handle combat updates (start, end, etc.)
 */
Hooks.on('updateCombat', async function(combat, changed, options, userId) {
  if (!tracker) return;

  // Combat started
  if (changed.active === true) {
    console.log(`${MODULE_ID} | Combat started`);
    tracker.populateFromCombat(combat);
    tracker.render(true);
  }
  // Combat ended
  else if (changed.active === false) {
    console.log(`${MODULE_ID} | Combat ended`);
    tracker.close();
  }
});

/**
 * Handle combat deletion
 */
Hooks.on('deleteCombat', async function(combat, options, userId) {
  if (!tracker) return;

  console.log(`${MODULE_ID} | Combat deleted`);
  tracker.close();
});
