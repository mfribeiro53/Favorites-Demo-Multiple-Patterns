/**
 * =============================================================================
 * FAVORITES STORE - ORCHESTRATED DESIGN PATTERNS
 * =============================================================================
 * 
 * This is the main orchestrator that combines all the modular components:
 * - StateStore: Core data management
 * - ObserverManager: Reactive notifications
 * - CommandManager: Undo/redo functionality
 * - ActionDefinitions: Business operations
 * 
 * This demonstrates how to compose different design patterns into a
 * cohesive, maintainable system with clear separation of concerns.
 * 
 * Benefits of this modular approach:
 * - Single Responsibility: Each module has one clear purpose
 * - Testability: Each module can be tested independently
 * - Maintainability: Changes to one area don't affect others
 * - Reusability: Modules can be used in different contexts
 * - Scalability: Easy to add new features or modify existing ones
 */

// Import all the modular components
import { createStateStore } from './store/state-store.js';
import { createObserverManager } from './observers/observer-manager.js';
import { createCommandManager } from './commands/command-manager.js';
import { 
  createAddFavoriteAction, 
  createRemoveFavoriteAction, 
  createClearAllAction,
  createBulkAddAction 
} from './actions/action-definitions.js';

// CommonJS imports for Node.js compatibility
let createStateStoreCommonJS, createObserverManagerCommonJS, createCommandManagerCommonJS;
let createAddFavoriteActionCommonJS, createRemoveFavoriteActionCommonJS, createClearAllActionCommonJS, createBulkAddActionCommonJS;

if (typeof require !== 'undefined') {
  try {
    const stateStore = require('./store/state-store.js');
    const observerManager = require('./observers/observer-manager.js');
    const commandManager = require('./commands/command-manager.js');
    const actions = require('./actions/action-definitions.js');
    
    createStateStoreCommonJS = stateStore.createStateStore;
    createObserverManagerCommonJS = observerManager.createObserverManager;
    createCommandManagerCommonJS = commandManager.createCommandManager;
    createAddFavoriteActionCommonJS = actions.createAddFavoriteAction;
    createRemoveFavoriteActionCommonJS = actions.createRemoveFavoriteAction;
    createClearAllActionCommonJS = actions.createClearAllAction;
    createBulkAddActionCommonJS = actions.createBulkAddAction;
  } catch (e) {
    // Fallback to ES6 imports if CommonJS fails
  }
}

/**
 * Factory function that creates a complete favorites store
 * by orchestrating all the component modules
 * 
 * @returns {Object} Complete favorites store with all functionality
 */
export const createFavoritesStore = () => {
  // ==========================================================================
  // INITIALIZE COMPONENT MODULES
  // ==========================================================================
  
  // Use CommonJS imports in Node.js environment, ES6 imports in browser
  const stateStore = (createStateStoreCommonJS || createStateStore)();
  const observerManager = (createObserverManagerCommonJS || createObserverManager)();
  const commandManager = (createCommandManagerCommonJS || createCommandManager)();
  
  // Action creators
  const createAddFavoriteActionFn = createAddFavoriteActionCommonJS || createAddFavoriteAction;
  const createRemoveFavoriteActionFn = createRemoveFavoriteActionCommonJS || createRemoveFavoriteAction;
  const createClearAllActionFn = createClearAllActionCommonJS || createClearAllAction;
  const createBulkAddActionFn = createBulkAddActionCommonJS || createBulkAddAction;

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================
  
  /**
   * Execute an action and notify observers
   * @param {Object} action - The action to execute
   * @returns {boolean} True if executed successfully
   */
  const executeAndNotify = (action) => {
    const wasExecuted = commandManager.executeAction(action);
    
    if (wasExecuted) {
      // Notify all observers of the state change
      observerManager.notifyAll(stateStore.getAll());
    }
    
    return wasExecuted;
  };

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================
  
  return {
    // ========================================================================
    // CORE CRUD OPERATIONS
    // ========================================================================
    
    /**
     * Add a URL to favorites
     * @param {string} url - The URL to add
     * @returns {boolean} True if added successfully
     */
    addFavorite(url) {
      // Early return if already exists (no action needed)
      if (stateStore.has(url)) {
        return false;
      }
      
      const action = createAddFavoriteActionFn(url, stateStore);
      return executeAndNotify(action);
    },

    /**
     * Remove a URL from favorites
     * @param {string} url - The URL to remove
     * @returns {boolean} True if removed successfully
     */
    removeFavorite(url) {
      // Early return if doesn't exist (no action needed)
      if (!stateStore.has(url)) {
        return false;
      }
      
      const action = createRemoveFavoriteActionFn(url, stateStore);
      return executeAndNotify(action);
    },

    /**
     * Check if a URL is in favorites
     * @param {string} url - The URL to check
     * @returns {boolean} True if in favorites
     */
    isFavorite(url) {
      return stateStore.has(url);
    },

    /**
     * Clear all favorites
     * @returns {boolean} True if cleared successfully
     */
    clearAll() {
      if (stateStore.isEmpty()) {
        return false; // Nothing to clear
      }
      
      const action = createClearAllActionFn(stateStore);
      return executeAndNotify(action);
    },

    /**
     * Add multiple URLs at once
     * @param {string[]} urls - Array of URLs to add
     * @returns {boolean} True if any were added
     */
    addMultiple(urls) {
      const action = createBulkAddActionFn(urls, stateStore);
      return executeAndNotify(action);
    },

    // ========================================================================
    // STATE ACCESS METHODS
    // ========================================================================
    
    /**
     * Get all favorites as an array
     * @returns {string[]} Array of all favorite URLs
     */
    getAllFavorites() {
      return stateStore.getAllAsArray();
    },

    /**
     * Get the count of favorites
     * @returns {number} Number of favorites
     */
    getCount() {
      return stateStore.getCount();
    },

    /**
     * Check if favorites list is empty
     * @returns {boolean} True if empty
     */
    isEmpty() {
      return stateStore.isEmpty();
    },

    // ========================================================================
    // OBSERVER PATTERN METHODS
    // ========================================================================
    
    /**
     * Subscribe to state changes
     * @param {Function} callback - Function to call on changes
     * @returns {Function} The callback (for easy unsubscription)
     */
    subscribe(callback) {
      return observerManager.subscribe(callback, stateStore.getAll());
    },

    /**
     * Unsubscribe from state changes
     * @param {Function} callback - The callback to remove
     * @returns {boolean} True if successfully unsubscribed
     */
    unsubscribe(callback) {
      return observerManager.unsubscribe(callback);
    },

    /**
     * Get the number of active subscribers
     * @returns {number} Number of subscribers
     */
    getSubscriberCount() {
      return observerManager.getSubscriberCount();
    },

    // ========================================================================
    // COMMAND PATTERN METHODS (UNDO/REDO)
    // ========================================================================
    
    /**
     * Undo the last action
     * @returns {boolean} True if undone successfully
     */
    undo() {
      const wasUndone = commandManager.undo();
      
      if (wasUndone) {
        // Notify observers of the state change
        observerManager.notifyAll(stateStore.getAll());
      }
      
      return wasUndone;
    },

    /**
     * Redo the next action
     * @returns {boolean} True if redone successfully
     */
    redo() {
      const wasRedone = commandManager.redo();
      
      if (wasRedone) {
        // Notify observers of the state change
        observerManager.notifyAll(stateStore.getAll());
      }
      
      return wasRedone;
    },

    /**
     * Check if undo is available
     * @returns {boolean} True if can undo
     */
    canUndo() {
      return commandManager.canUndo();
    },

    /**
     * Check if redo is available
     * @returns {boolean} True if can redo
     */
    canRedo() {
      return commandManager.canRedo();
    },

    /**
     * Get action history information
     * @returns {Object} History with actions and metadata
     */
    getActionHistory() {
      return commandManager.getHistory();
    },

    /**
     * Clear action history
     * @param {boolean} keepCurrent - Whether to keep current position
     */
    clearHistory(keepCurrent = false) {
      commandManager.clearHistory(keepCurrent);
    },

    /**
     * Get usage statistics
     * @returns {Object} Statistics about store usage
     */
    getStatistics() {
      return {
        ...commandManager.getStatistics(),
        favoritesCount: stateStore.getCount(),
        subscriberCount: observerManager.getSubscriberCount(),
        isEmpty: stateStore.isEmpty()
      };
    },

    // ========================================================================
    // DEBUGGING AND INTROSPECTION
    // ========================================================================
    
    /**
     * Get internal state for debugging (read-only)
     * @returns {Object} Debug information
     */
    getDebugInfo() {
      return {
        stateCount: stateStore.getCount(),
        subscriberCount: observerManager.getSubscriberCount(),
        historyLength: commandManager.getHistory().totalActions,
        canUndo: commandManager.canUndo(),
        canRedo: commandManager.canRedo(),
        isEmpty: stateStore.isEmpty()
      };
    }
  };
};

// =============================================================================
// CREATE SINGLETON INSTANCE
// =============================================================================

/**
 * Create the default store instance
 * In larger applications, you might inject this or create multiple instances
 */
export const favoritesStore = createFavoritesStore();

// CommonJS compatibility for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createFavoritesStore,
    favoritesStore
  };
}

// =============================================================================
// PATTERN DOCUMENTATION
// =============================================================================

/**
 * MODULAR DESIGN PATTERNS IMPLEMENTED:
 * 
 * 1. STATE STORE MODULE (store/state-store.js):
 *    - Manages core data (Set of favorites)
 *    - Provides CRUD operations
 *    - Ensures data integrity and immutability
 * 
 * 2. OBSERVER MANAGER MODULE (observers/observer-manager.js):
 *    - Manages subscriber callbacks
 *    - Handles notification broadcasting
 *    - Provides subscription lifecycle management
 * 
 * 3. COMMAND MANAGER MODULE (commands/command-manager.js):
 *    - Executes actions and manages history
 *    - Provides undo/redo functionality
 *    - Handles command execution errors
 * 
 * 4. ACTION DEFINITIONS MODULE (actions/action-definitions.js):
 *    - Defines all business operations as commands
 *    - Encapsulates action logic and metadata
 *    - Provides action factory functions
 * 
 * 5. MAIN ORCHESTRATOR (this file):
 *    - Coordinates all modules
 *    - Provides unified public API
 *    - Handles cross-module communication
 * 
 * BENEFITS OF THIS APPROACH:
 * - Clear separation of concerns
 * - Each module is independently testable
 * - Easy to modify or extend individual modules
 * - Better code organization and maintainability
 * - Modules can be reused in different contexts
 * - Follows SOLID principles
 */
