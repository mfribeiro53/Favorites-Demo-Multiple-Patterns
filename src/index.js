/**
 * =============================================================================
 * MODULAR FAVORITES STORE - MAIN EXPORTS
 * =============================================================================
 * 
 * This file provides a clean entry point for the modular architecture.
 * It exports both individual modules and the complete store for flexibility.
 */

// Export the complete orchestrated store (most common use case)
export { createFavoritesStore, favoritesStore } from './favorites-store-modular.js';

// Export individual modules for advanced use cases
export { createStateStore } from './store/state-store.js';
export { createObserverManager } from './observers/observer-manager.js';
export { createCommandManager } from './commands/command-manager.js';
export { 
  createAddFavoriteAction,
  createRemoveFavoriteAction,
  createClearAllAction,
  createBulkAddAction,
  createAction,
  getAvailableActionTypes 
} from './actions/action-definitions.js';

/**
 * USAGE EXAMPLES:
 * 
 * // Most common - use the complete store
 * import { favoritesStore } from './src/index.js';
 * favoritesStore.addFavorite('https://example.com');
 * 
 * // Advanced - create custom store
 * import { createFavoritesStore } from './src/index.js';
 * const myStore = createFavoritesStore();
 * 
 * // Expert - use individual modules
 * import { createStateStore, createObserverManager } from './src/index.js';
 * const state = createStateStore();
 * const observers = createObserverManager();
 * 
 * // Testing - use specific modules
 * import { createAddFavoriteAction } from './src/index.js';
 * const action = createAddFavoriteAction('test-url', mockStateStore);
 */
