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
 * - Persist changes to database via database service
 * 
 * Design Principles:
 * - Command Pattern: Each action is a complete command object
 * - Reversibility: Every action can be undone
 * - Encapsulation: Action logic is self-contained
 * - Metadata: Actions provide descriptive information
 * - Database Integration: All actions persist to database
 */

// Import database service functions for persistence
import { 
  addFavorite as dbAddFavorite, 
  removeFavorite as dbRemoveFavorite, 
  clearAllFavorites as dbClearAllFavorites 
} from '../database-service.js';

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
    
    async execute() {
      try {
        // First add to database
        const dbSuccess = await dbAddFavorite(url);
        
        if (dbSuccess) {
          // If database operation succeeded, update local state
          const stateSuccess = stateStore.add(url);
          console.log(`✅ Added "${url}" to favorites (database + local state)`);
          return stateSuccess;
        } else {
          console.log(`ℹ️ "${url}" already exists in database`);
          // Even if already in DB, ensure it's in local state
          return stateStore.add(url);
        }
      } catch (error) {
        console.error(`❌ Failed to add "${url}" to database:`, error.message);
        // Fallback to local state only
        const stateSuccess = stateStore.add(url);
        console.log(`⚠️ Added "${url}" to local state only (database unavailable)`);
        return stateSuccess;
      }
    },
    
    async undo() {
      try {
        // Remove from database
        const dbSuccess = await dbRemoveFavorite(url);
        
        if (dbSuccess) {
          // If database operation succeeded, update local state
          const stateSuccess = stateStore.remove(url);
          console.log(`✅ Removed "${url}" from favorites (undo - database + local state)`);
          return stateSuccess;
        } else {
          console.log(`ℹ️ "${url}" was not in database (undo)`);
          // Still remove from local state
          return stateStore.remove(url);
        }
      } catch (error) {
        console.error(`❌ Failed to remove "${url}" from database (undo):`, error.message);
        // Fallback to local state only
        const stateSuccess = stateStore.remove(url);
        console.log(`⚠️ Removed "${url}" from local state only (undo - database unavailable)`);
        return stateSuccess;
      }
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
    
    async execute() {
      try {
        // First remove from database
        const dbSuccess = await dbRemoveFavorite(url);
        
        if (dbSuccess) {
          // If database operation succeeded, update local state
          const stateSuccess = stateStore.remove(url);
          console.log(`✅ Removed "${url}" from favorites (database + local state)`);
          return stateSuccess;
        } else {
          console.log(`ℹ️ "${url}" was not in database`);
          // Still remove from local state if it exists there
          return stateStore.remove(url);
        }
      } catch (error) {
        console.error(`❌ Failed to remove "${url}" from database:`, error.message);
        // Fallback to local state only
        const stateSuccess = stateStore.remove(url);
        console.log(`⚠️ Removed "${url}" from local state only (database unavailable)`);
        return stateSuccess;
      }
    },
    
    async undo() {
      try {
        // Add back to database
        const dbSuccess = await dbAddFavorite(url);
        
        if (dbSuccess) {
          // If database operation succeeded, update local state
          const stateSuccess = stateStore.add(url);
          console.log(`✅ Added "${url}" back to favorites (undo - database + local state)`);
          return stateSuccess;
        } else {
          console.log(`ℹ️ "${url}" already exists in database (undo)`);
          // Still add to local state
          return stateStore.add(url);
        }
      } catch (error) {
        console.error(`❌ Failed to add "${url}" back to database (undo):`, error.message);
        // Fallback to local state only
        const stateSuccess = stateStore.add(url);
        console.log(`⚠️ Added "${url}" to local state only (undo - database unavailable)`);
        return stateSuccess;
      }
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
    
    async execute() {
      try {
        // Capture state before clearing (for undo)
        previousState = stateStore.getAll();
        
        // First clear from database
        const dbSuccess = await dbClearAllFavorites();
        
        if (dbSuccess) {
          // If database operation succeeded, clear local state
          const stateSuccess = stateStore.clear();
          console.log(`✅ Cleared all favorites (database + local state)`);
          return stateSuccess;
        } else {
          console.log(`ℹ️ No favorites to clear in database`);
          // Still clear local state
          return stateStore.clear();
        }
      } catch (error) {
        console.error(`❌ Failed to clear favorites from database:`, error.message);
        // Fallback to local state only
        const stateSuccess = stateStore.clear();
        console.log(`⚠️ Cleared local state only (database unavailable)`);
        return stateSuccess;
      }
    },
    
    async undo() {
      if (previousState) {
        try {
          // Re-add all items to database
          const addPromises = previousState.map(url => dbAddFavorite(url));
          const results = await Promise.allSettled(addPromises);
          
          // Count successes
          const successes = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
          
          if (successes > 0) {
            // Restore local state
            stateStore.restore(previousState);
            console.log(`✅ Restored ${successes}/${previousState.size} favorites (undo - database + local state)`);
            return true;
          } else {
            console.log(`ℹ️ Could not restore to database, restoring local state only`);
            stateStore.restore(previousState);
            return true;
          }
        } catch (error) {
          console.error(`❌ Failed to restore favorites to database (undo):`, error.message);
          // Fallback to local state only
          stateStore.restore(previousState);
          console.log(`⚠️ Restored local state only (undo - database unavailable)`);
          return true;
        }
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
    
    async execute() {
      addedUrls.length = 0; // Reset tracking
      
      try {
        // Add all URLs to database in parallel
        const dbPromises = validUrls.map(url => dbAddFavorite(url));
        const dbResults = await Promise.allSettled(dbPromises);
        
        let dbSuccessCount = 0;
        
        // Process results and update local state
        validUrls.forEach((url, index) => {
          const dbResult = dbResults[index];
          const dbSuccess = dbResult.status === 'fulfilled' && dbResult.value === true;
          
          if (dbSuccess) {
            dbSuccessCount++;
          }
          
          // Add to local state regardless (for consistency)
          const wasAdded = stateStore.add(url);
          if (wasAdded) {
            addedUrls.push(url);
          }
        });
        
        console.log(`✅ Bulk added ${dbSuccessCount}/${validUrls.length} URLs to database, ${addedUrls.length} to local state`);
        return addedUrls.length > 0;
        
      } catch (error) {
        console.error(`❌ Failed to bulk add to database:`, error.message);
        
        // Fallback to local state only
        validUrls.forEach(url => {
          const wasAdded = stateStore.add(url);
          if (wasAdded) {
            addedUrls.push(url);
          }
        });
        
        console.log(`⚠️ Bulk added ${addedUrls.length} URLs to local state only (database unavailable)`);
        return addedUrls.length > 0;
      }
    },
    
    async undo() {
      if (addedUrls.length === 0) {
        return false;
      }
      
      try {
        // Remove all added URLs from database
        const dbPromises = addedUrls.map(url => dbRemoveFavorite(url));
        const dbResults = await Promise.allSettled(dbPromises);
        
        const dbSuccessCount = dbResults.filter(r => r.status === 'fulfilled' && r.value === true).length;
        
        // Remove from local state
        let removedCount = 0;
        addedUrls.forEach(url => {
          const wasRemoved = stateStore.remove(url);
          if (wasRemoved) {
            removedCount++;
          }
        });
        
        addedUrls.length = 0; // Clear tracking
        
        console.log(`✅ Bulk removed ${dbSuccessCount}/${addedUrls.length} URLs from database (undo)`);
        return removedCount > 0;
        
      } catch (error) {
        console.error(`❌ Failed to bulk remove from database (undo):`, error.message);
        
        // Fallback to local state only
        let removedCount = 0;
        addedUrls.forEach(url => {
          const wasRemoved = stateStore.remove(url);
          if (wasRemoved) {
            removedCount++;
          }
        });
        
        addedUrls.length = 0; // Clear tracking
        
        console.log(`⚠️ Bulk removed ${removedCount} URLs from local state only (undo - database unavailable)`);
        return removedCount > 0;
      }
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


