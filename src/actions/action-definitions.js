/**
 * =============================================================================
 * ACTION DEFINITIONS - COMMAND PATTERN IMPLEMENTATIONS
 * =============================================================================
 * 
 * This module defines all available actions for the favorites system.
 * Each action is a command object with execute() and undo() methods.
 * 
 * Responsibilities:
 * - Define all business operations as reversible commands
 * - Encapsulate operation logic and undo logic
 * - Provide action metadata (type, description)
 * - Maintain action parameter validation
 * 
 * Design Principles:
 * - Command Pattern: Each action is a complete command object
 * - Reversibility: Every action can be undone
 * - Encapsulation: Action logic is self-contained
 * - Metadata: Actions provide descriptive information
 */

/**
 * Creates an "Add Favorite" action
 * @param {string} url - The URL to add
 * @param {Object} stateStore - The state store to operate on
 * @returns {Object} Command object with execute/undo methods
 */
export const createAddFavoriteAction = (url, stateStore) => {
  if (!url?.length || typeof url !== 'string') {
    throw new Error('URL must be a non-empty string');
  }
  
  return {
    type: 'ADD_FAVORITE',
    url,
    description: `Add "${url}" to favorites`,
    timestamp: new Date().toISOString(),
    
    execute() {
      return stateStore.add(url);
    },
    
    undo() {
      return stateStore.remove(url);
    },
    
    // Metadata for debugging/logging
    getMetadata() {
      return {
        type: this.type,
        url: this.url,
        description: this.description,
        timestamp: this.timestamp
      };
    }
  };
};

/**
 * Creates a "Remove Favorite" action
 * @param {string} url - The URL to remove
 * @param {Object} stateStore - The state store to operate on
 * @returns {Object} Command object with execute/undo methods
 */
export const createRemoveFavoriteAction = (url, stateStore) => {
  if (!url?.length || typeof url !== 'string') {
    throw new Error('URL must be a non-empty string');
  }
  
  return {
    type: 'REMOVE_FAVORITE',
    url,
    description: `Remove "${url}" from favorites`,
    timestamp: new Date().toISOString(),
    
    execute() {
      return stateStore.remove(url);
    },
    
    undo() {
      return stateStore.add(url);
    },
    
    getMetadata() {
      return {
        type: this.type,
        url: this.url,
        description: this.description,
        timestamp: this.timestamp
      };
    }
  };
};

/**
 * Creates a "Clear All Favorites" action
 * @param {Object} stateStore - The state store to operate on
 * @returns {Object} Command object with execute/undo methods
 */
export const createClearAllAction = (stateStore) => {
  // Capture current state for undo
  const currentCount = stateStore.getCount();
  let previousState = null;
  
  return {
    type: 'CLEAR_ALL',
    description: `Clear all ${currentCount} favorites`,
    timestamp: new Date().toISOString(),
    affectedCount: currentCount,
    
    execute() {
      // Capture state before clearing (for undo)
      previousState = stateStore.getAll();
      return stateStore.clear();
    },
    
    undo() {
      if (previousState) {
        stateStore.restore(previousState);
        return true;
      }
      return false;
    },
    
    getMetadata() {
      return {
        type: this.type,
        description: this.description,
        timestamp: this.timestamp,
        affectedCount: this.affectedCount
      };
    }
  };
};

/**
 * Creates a "Bulk Add" action for adding multiple URLs at once
 * @param {string[]} urls - Array of URLs to add
 * @param {Object} stateStore - The state store to operate on
 * @returns {Object} Command object with execute/undo methods
 */
export const createBulkAddAction = (urls, stateStore) => {
  if (!Array.isArray(urls) || urls.length === 0) {
    throw new Error('URLs must be a non-empty array');
  }
  
  // Validate all URLs
  const validUrls = urls.filter(url => url?.length && typeof url === 'string');
  if (validUrls.length === 0) {
    throw new Error('No valid URLs provided');
  }
  
  const addedUrls = []; // Track what was actually added for undo
  
  return {
    type: 'BULK_ADD',
    urls: validUrls,
    description: `Add ${validUrls.length} URLs to favorites`,
    timestamp: new Date().toISOString(),
    
    execute() {
      addedUrls.length = 0; // Reset tracking
      
      validUrls.forEach(url => {
        const wasAdded = stateStore.add(url);
        if (wasAdded) {
          addedUrls.push(url);
        }
      });
      
      return addedUrls.length > 0;
    },
    
    undo() {
      let removedCount = 0;
      addedUrls.forEach(url => {
        const wasRemoved = stateStore.remove(url);
        if (wasRemoved) {
          removedCount++;
        }
      });
      
      addedUrls.length = 0; // Clear tracking
      return removedCount > 0;
    },
    
    getMetadata() {
      return {
        type: this.type,
        urlCount: this.urls.length,
        description: this.description,
        timestamp: this.timestamp,
        addedCount: addedUrls.length
      };
    }
  };
};

/**
 * Action factory - creates actions based on type and parameters
 * @param {string} actionType - The type of action to create
 * @param {Object} params - Parameters for the action
 * @param {Object} stateStore - The state store to operate on
 * @returns {Object} The created action command
 */
export const createAction = (actionType, params, stateStore) => {
  switch (actionType) {
    case 'ADD_FAVORITE':
      return createAddFavoriteAction(params.url, stateStore);
      
    case 'REMOVE_FAVORITE':
      return createRemoveFavoriteAction(params.url, stateStore);
      
    case 'CLEAR_ALL':
      return createClearAllAction(stateStore);
      
    case 'BULK_ADD':
      return createBulkAddAction(params.urls, stateStore);
      
    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
};

/**
 * Get all available action types
 * @returns {string[]} Array of action type strings
 */
export const getAvailableActionTypes = () => [
  'ADD_FAVORITE',
  'REMOVE_FAVORITE',
  'CLEAR_ALL',
  'BULK_ADD'
];

// CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createAddFavoriteAction,
    createRemoveFavoriteAction,
    createClearAllAction,
    createBulkAddAction,
    createAction,
    getAvailableActionTypes
  };
}
