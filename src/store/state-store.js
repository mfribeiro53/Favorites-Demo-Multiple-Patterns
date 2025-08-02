/**
 * =============================================================================
 * STATE STORE - CORE DATA MANAGEMENT
 * =============================================================================
 * 
 * This module is responsible for:
 * - Managing the core data structure (favorites Set)
 * - Providing basic CRUD operations
 * - Maintaining data integrity and immutability
 * - No business logic, just pure state management
 * 
 * Design Principles:
 * - Single Responsibility: Only manages state
 * - Immutable State: Always returns copies
 * - Performance: Uses Set for O(1) operations
 * - Type Safety: Input validation on all operations
 */

/**
 * Creates a core state store for managing favorites
 * 
 * @returns {Object} State store with basic CRUD operations
 */
export const createStateStore = () => {
  // ==========================================================================
  // PRIVATE STATE
  // ==========================================================================
  
  /**
   * Core data structure - private to this module
   * Using Set for optimal performance and automatic deduplication
   */
  const favorites = new Set();

  // ==========================================================================
  // CORE STATE OPERATIONS
  // ==========================================================================
  
  return {
    /**
     * Add an item to the state
     * @param {string} url - The URL to add
     * @returns {boolean} True if added, false if already exists
     */
    add(url) {
      if (!url?.length || typeof url !== 'string') {
        throw new Error('URL must be a non-empty string');
      }
      
      const wasAdded = !favorites.has(url);
      if (wasAdded) {
        favorites.add(url);
      }
      return wasAdded;
    },

    /**
     * Remove an item from the state
     * @param {string} url - The URL to remove
     * @returns {boolean} True if removed, false if didn't exist
     */
    remove(url) {
      if (!url?.length || typeof url !== 'string') {
        throw new Error('URL must be a non-empty string');
      }
      
      return favorites.delete(url);
    },

    /**
     * Check if an item exists in the state
     * @param {string} url - The URL to check
     * @returns {boolean} True if exists
     */
    has(url) {
      return favorites.has(url);
    },

    /**
     * Get all items as an immutable copy
     * @returns {Set} Copy of the current state
     */
    getAll() {
      return new Set(favorites);
    },

    /**
     * Get all items as an array
     * @returns {string[]} Array of all URLs
     */
    getAllAsArray() {
      return Array.from(favorites);
    },

    /**
     * Get the count of items
     * @returns {number} Number of items in state
     */
    getCount() {
      return favorites.size;
    },

    /**
     * Clear all items
     * @returns {Set} Copy of the previous state (for undo purposes)
     */
    clear() {
      const previousState = new Set(favorites);
      favorites.clear();
      return previousState;
    },

    /**
     * Restore state from a previous snapshot
     * @param {Set} snapshot - Previous state to restore
     */
    restore(snapshot) {
      if (!(snapshot instanceof Set)) {
        throw new Error('Snapshot must be a Set');
      }
      
      favorites.clear();
      snapshot.forEach(url => favorites.add(url));
    },

    /**
     * Check if the state is empty
     * @returns {boolean} True if no items
     */
    isEmpty() {
      return favorites.size === 0;
    }
  };
};

// CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createStateStore };
}
