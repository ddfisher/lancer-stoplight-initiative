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
      width: 950,
      height: 180,
      resizable: false,
      minimizable: false,
      closeOnEscape: false,
      popOut: true,
      classes: ['stoplight-initiative-app'],
      top: 80,
      left: 120
    });
  }

  /**
   * Provide data to the Handlebars template
   */
  getData(options = {}) {
    // Get current combatant ID if there's an active combat
    const currentCombatantId = game.combat?.combatant?.id;

    // Mark which combatants are current
    const markCurrent = (combatants) => {
      return combatants.map(c => ({
        ...c,
        isCurrent: c.id === currentCombatantId
      }));
    };

    return {
      green: markCurrent(this.trackerData.green),
      yellow: markCurrent(this.trackerData.yellow),
      red: markCurrent(this.trackerData.red)
    };
  }

  /**
   * Handle closing - prevent escape key from closing
   */
  async close(options={}) {
    // Only allow closing if explicitly forced
    if (!options.force) {
      return;
    }
    return super.close(options);
  }

  /**
   * Activate event listeners after rendering
   */
  activateListeners(html) {
    super.activateListeners(html);

    // Make custom header draggable
    const header = html.find('.tracker-header-bar')[0];
    if (header) {
      header.addEventListener('mousedown', this._onCustomDragStart.bind(this));
    }

    // Drag and drop functionality for combatants
    this._setupDragAndDrop(html);

    // Double-click to start turn (GM only)
    html.find('.combatant-entry').on('dblclick', async (event) => {
      if (!game.user.isGM) return;

      const combatantId = $(event.currentTarget).data('combatant-id');
      const combat = game.combat;
      if (!combat) return;

      console.log(`${MODULE_ID} | GM activating combatant ${combatantId}`);

      // Use Lancer's activateCombatant method if available
      if (typeof combat.activateCombatant === 'function') {
        await combat.activateCombatant(combatantId);
      } else {
        // Fallback to standard Foundry combat
        const turnIndex = combat.turns.findIndex(t => t.id === combatantId);
        if (turnIndex !== -1) {
          await combat.update({ turn: turnIndex });
        }
      }
    });
  }

  /**
   * Handle custom drag start for the header
   */
  _onCustomDragStart(event) {
    event.preventDefault();

    const initialX = event.clientX;
    const initialY = event.clientY;
    const initialLeft = this.position.left;
    const initialTop = this.position.top;

    const onMouseMove = (e) => {
      const deltaX = e.clientX - initialX;
      const deltaY = e.clientY - initialY;

      this.setPosition({
        left: initialLeft + deltaX,
        top: initialTop + deltaY
      });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  /**
   * Set up drag and drop event listeners
   */
  _setupDragAndDrop(html) {
    // Make combatant entries draggable
    html.find('.combatant-entry').each((i, el) => {
      const $el = $(el);
      const combatantId = $el.data('combatant-id');

      $el.on('dragstart', (event) => {
        event.originalEvent.dataTransfer.setData('text/plain', combatantId);
        $el.addClass('dragging');

        // Check permissions
        if (!this._canDragCombatant(combatantId)) {
          event.preventDefault();
          ui.notifications.warn("You can only move your own character!");
          return false;
        }
      });

      $el.on('dragend', (event) => {
        $el.removeClass('dragging');
      });
    });

    // Set up drop zones (green, yellow, and red)
    html.find('[data-drop-zone]').each((i, el) => {
      const $dropZone = $(el);
      const targetZone = $dropZone.data('drop-zone');

      $dropZone.on('dragover', (event) => {
        event.preventDefault();
        $dropZone.addClass('drag-over');
      });

      $dropZone.on('dragleave', (event) => {
        $dropZone.removeClass('drag-over');
      });

      $dropZone.on('drop', async (event) => {
        event.preventDefault();
        $dropZone.removeClass('drag-over');

        const combatantId = event.originalEvent.dataTransfer.getData('text/plain');
        if (combatantId) {
          await this._moveCombatantToZone(combatantId, targetZone);
        }
      });
    });
  }

  /**
   * Check if the current user can drag a combatant
   */
  _canDragCombatant(combatantId) {
    // GMs can move anyone
    if (game.user.isGM) return true;

    // Find the combatant
    const combat = game.combat;
    if (!combat) return false;

    const combatant = combat.combatants.get(combatantId);
    if (!combatant) return false;

    // Players can only move their own characters
    const actor = combatant.actor;
    if (!actor) return false;

    return actor.isOwner;
  }

  /**
   * Move a combatant to a different zone
   */
  async _moveCombatantToZone(combatantId, targetZone) {
    const combat = game.combat;
    if (!combat) return;

    const combatant = combat.combatants.get(combatantId);
    if (!combatant) return;

    const activations = combatant.activations || { value: 1, max: 1 };

    if (targetZone === 'red') {
      // Moving to red: consume all remaining activations
      if (activations.value > 0) {
        if (typeof combatant.modifyCurrentActivations === 'function') {
          // Use Lancer method
          await combatant.modifyCurrentActivations(-activations.value);
        } else {
          // Fallback
          await combatant.update({ 'activations.value': 0 });
        }
        console.log(`${MODULE_ID} | ${combatant.name} moved to red (activations consumed)`);
      }

      // Also clear wantsToGo flag
      await combatant.unsetFlag(MODULE_ID, 'wantsToGo');
    } else if (targetZone === 'green') {
      // Moving to green: set wantsToGo flag for this round
      await combatant.setFlag(MODULE_ID, 'wantsToGo', combat.round);
      console.log(`${MODULE_ID} | ${combatant.name} wants to go in round ${combat.round}`);

      // If coming from red (0 activations), restore activations
      if (activations.value === 0) {
        const maxActivations = activations.max || 1;
        if (typeof combatant.modifyCurrentActivations === 'function') {
          // Use Lancer method
          await combatant.modifyCurrentActivations(maxActivations);
        } else {
          // Fallback
          await combatant.update({ 'activations.value': maxActivations });
        }
        console.log(`${MODULE_ID} | ${combatant.name} activations restored to ${maxActivations}`);
      }
    } else if (targetZone === 'yellow') {
      // Moving to yellow: clear wantsToGo flag
      await combatant.unsetFlag(MODULE_ID, 'wantsToGo');
      console.log(`${MODULE_ID} | ${combatant.name} moved to yellow (cleared want to go)`);

      // If coming from red (0 activations), restore activations
      if (activations.value === 0) {
        const maxActivations = activations.max || 1;
        if (typeof combatant.modifyCurrentActivations === 'function') {
          // Use Lancer method
          await combatant.modifyCurrentActivations(maxActivations);
        } else {
          // Fallback
          await combatant.update({ 'activations.value': maxActivations });
        }
        console.log(`${MODULE_ID} | ${combatant.name} activations restored to ${maxActivations}`);
      }
    }

    // Re-render will happen automatically via updateCombatant hook
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
   * Reads state from combatant flags and activations
   */
  populateFromCombat(combat) {
    if (!combat) {
      this.trackerData = { green: [], yellow: [], red: [] };
      this.render(false);
      return;
    }

    console.log(`${MODULE_ID} | Populating from combat:`, combat);

    // Get all friendly combatants and sort them into zones
    const green = [];
    const yellow = [];
    const red = [];
    const currentRound = combat.round;
    const currentCombatantId = combat.combatant?.id;

    Array.from(combat.combatants).forEach(c => {
      // Check token disposition - only include FRIENDLY (value 1)
      const disposition = c.token?.disposition ?? c.actor?.prototypeToken?.disposition;
      if (disposition !== CONST.TOKEN_DISPOSITIONS.FRIENDLY) {
        return;
      }

      // Convert to our display format
      const combatantData = {
        id: c.id,
        name: c.name,
        img: c.img || c.actor?.img || 'icons/svg/mystery-man.svg',
        actorId: c.actorId,
        tokenId: c.tokenId
      };

      // Check activations (Lancer-specific)
      const activations = c.activations || { value: 1, max: 1 };
      const isCurrentTurn = c.id === currentCombatantId;

      // Red zone: no activations left AND it's not currently their turn
      if (activations.value === 0 && !isCurrentTurn) {
        red.push(combatantData);
      }
      // Green zone: wants to go this round (flag equals current round number)
      else if (c.getFlag(MODULE_ID, 'wantsToGo') === currentRound) {
        green.push(combatantData);
      }
      // Yellow zone: default (has activations or is current turn, but doesn't want to go)
      else {
        yellow.push(combatantData);
      }
    });

    this.trackerData = { green, yellow, red };

    console.log(`${MODULE_ID} | Sorted into zones (round ${currentRound}):`, {
      green: green.length,
      yellow: yellow.length,
      red: red.length
    });

    this.render(false);
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
 * Handle combat updates (turn changes, round changes, etc.)
 * Re-read state from combat and combatant flags
 */
Hooks.on('updateCombat', async function(combat, changed, options, userId) {
  if (!tracker) return;

  console.log(`${MODULE_ID} | Combat updated:`, changed);

  // Combat started (round changed from null/0 to 1 or higher)
  if (changed.round !== undefined && changed.round >= 1 && !tracker.rendered) {
    console.log(`${MODULE_ID} | Combat started - round ${changed.round}`);
    tracker.populateFromCombat(combat);
    tracker.render(true);
  }
  // Combat ended
  else if (changed.round === null || changed.active === false) {
    console.log(`${MODULE_ID} | Combat ended`);
    tracker.close();
  }
  // Any other change (turn, round, etc.) - re-populate from combat
  // This catches activation changes from Lancer and turn/round changes
  else if (tracker.rendered) {
    console.log(`${MODULE_ID} | Combat state changed, re-populating tracker`);
    tracker.populateFromCombat(combat);
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

/**
 * Handle combatant creation (actor added to combat)
 */
Hooks.on('createCombatant', async function(combatant, options, userId) {
  if (!tracker || !tracker.rendered) return;

  const combat = combatant.combat || game.combat;
  if (!combat) return;

  console.log(`${MODULE_ID} | Combatant added: ${combatant.name}`);

  // Refresh the tracker with updated combatants
  tracker.populateFromCombat(combat);
  tracker.render(false);
});

/**
 * Handle combatant deletion (actor removed from combat)
 */
Hooks.on('deleteCombatant', async function(combatant, options, userId) {
  if (!tracker || !tracker.rendered) return;

  const combat = game.combat;
  if (!combat) return;

  console.log(`${MODULE_ID} | Combatant removed: ${combatant.name}`);

  // Refresh the tracker with updated combatants
  tracker.populateFromCombat(combat);
  tracker.render(false);
});

/**
 * Handle combatant updates (flags, activations, etc.)
 * This enables synchronization across clients when someone drags
 */
Hooks.on('updateCombatant', async function(combatant, changed, options, userId) {
  if (!tracker || !tracker.rendered) return;

  const combat = game.combat;
  if (!combat) return;

  // Check if our wantsToGo flag changed, or if Lancer activations changed
  const activationsChanged = changed.flags?.lancer?.activations !== undefined;

  if (changed.flags?.['stoplight-initiative'] !== undefined || activationsChanged) {
    console.log(`${MODULE_ID} | Combatant ${combatant.name} updated, re-populating tracker`);
    tracker.populateFromCombat(combat);
  }
});
