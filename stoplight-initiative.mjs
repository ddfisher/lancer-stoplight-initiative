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
      resizable: false,
      minimizable: false,
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
   * For now, just puts everyone in yellow zone
   */
  populateFromCombat(combat) {
    if (!combat) {
      this.trackerData = { green: [], yellow: [], red: [] };
      this.render(false);
      return;
    }

    // Get all combatants and convert to our format
    const combatants = combat.combatants.map(c => ({
      id: c.id,
      name: c.name,
      img: c.img || c.actor?.img || 'icons/svg/mystery-man.svg',
      actorId: c.actorId,
      tokenId: c.tokenId
    }));

    // Start everyone in yellow (neutral) state
    this.trackerData = {
      green: [],
      yellow: combatants,
      red: []
    };

    this.render(false);
  }

  /**
   * Reset all combatants to yellow zone (start of new round)
   */
  resetForNewRound() {
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
  }

  /**
   * Move a combatant to the red zone (after their turn)
   */
  moveCombatantToRed(combatantId) {
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
