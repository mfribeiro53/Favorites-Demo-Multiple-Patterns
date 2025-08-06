/**
 * =============================================================================
 * COMMAND MANAGER - UNDO/REDO FUNCTIONALITY
 * =============================================================================
 * 
 * This module manages the execution and history of commands.
 * It implements the Command Pattern with undo/redo capabilities.
 * 
 * Responsibilities:
 * - Execute actions and track them in history
 * - Provide undo/redo functionality
 * - Manage action history and navigation
 * - Handle command execution errors
 * 
 * Design Principles:
 * - Command Pattern: Actions are executed through this manager
 * - History Management: Maintains reversible action history
 * - Error Handling: Graceful handling of command failures
 * - State Integrity: Ensures consistent state after operations
 */

/**
 * Creates a command manager for handling action execution and history
 * 
 * @returns {Object} Command manager with execution and history methods
 */
export const createCommandManager = () => {
  // ==========================================================================
  // PRIVATE STATE
  // ==========================================================================
  
  /**
   * History of executed actions
   * Each item is a command object with execute/undo methods
   */
  const actionHistory = [];
  
  /**
   * Current position in the action history
   * -1 means no actions have been executed
   */
  let currentHistoryIndex = -1;

  // ==========================================================================
  // COMMAND EXECUTION
  // ==========================================================================
  
  return {
    /**
     * Execute an action and add it to history
     * @param {Object} action - Command object with execute/undo methods
     * @returns {Promise<boolean>} True if executed successfully
     */
    async executeAction(action) {
      if (!action || typeof action.execute !== 'function') {
        throw new Error('Action must have an execute method');
      }
      
      try {
        // Execute the action (may be async)
        const result = await action.execute();
        
        // If execution was successful (or didn't return false)
        if (result !== false) {
          // Remove any "future" history if we're in the middle of history
          if (currentHistoryIndex < actionHistory.length - 1) {
            actionHistory.splice(currentHistoryIndex + 1);
          }
          
          // Add action to history
          actionHistory.push(action);
          currentHistoryIndex++;
          
          return true;
        }
        
        return false; // Action decided not to execute
        
      } catch (error) {
        console.error('Error executing action:', error);
        console.error('Action details:', action.getMetadata?.() || action);
        throw error; // Re-throw for caller to handle
      }
    },

    /**
     * Undo the last executed action
     * @returns {Promise<boolean>} True if an action was undone
     */
    async undo() {
      if (currentHistoryIndex < 0) {
        return false; // No actions to undo
      }
      
      try {
        const action = actionHistory[currentHistoryIndex];
        
        if (typeof action.undo !== 'function') {
          throw new Error('Action does not support undo');
        }
        
        // Execute the undo (may be async)
        await action.undo();
        
        // Move backward in history
        currentHistoryIndex--;
        
        return true;
        
      } catch (error) {
        console.error('Error during undo:', error);
        return false;
      }
    },

    /**
     * Redo the next action in history
     * @returns {Promise<boolean>} True if an action was redone
     */
    async redo() {
      if (currentHistoryIndex >= actionHistory.length - 1) {
        return false; // No actions to redo
      }
      
      try {
        // Move forward in history first
        currentHistoryIndex++;
        const action = actionHistory[currentHistoryIndex];
        
        // Re-execute the action (may be async)
        await action.execute();
        
        return true;
        
      } catch (error) {
        console.error('Error during redo:', error);
        // Move back on error
        currentHistoryIndex--;
        return false;
      }
    },

    /**
     * Check if undo is available
     * @returns {boolean} True if there are actions to undo
     */
    canUndo() {
      return currentHistoryIndex >= 0;
    },

    /**
     * Check if redo is available
     * @returns {boolean} True if there are actions to redo
     */
    canRedo() {
      return currentHistoryIndex < actionHistory.length - 1;
    },

    /**
     * Get the current action history
     * @returns {Object} History information with actions and current position
     */
    getHistory() {
      return {
        actions: actionHistory.map((action, index) => ({
          ...action.getMetadata?.() || {
            type: action.type || 'UNKNOWN',
            description: action.description || 'No description'
          },
          isCurrentPosition: index === currentHistoryIndex,
          index
        })),
        currentIndex: currentHistoryIndex,
        totalActions: actionHistory.length,
        canUndo: this.canUndo(),
        canRedo: this.canRedo()
      };
    },

    /**
     * Clear the action history
     * @param {boolean} keepCurrent - If true, keeps actions up to current position
     */
    clearHistory(keepCurrent = false) {
      if (keepCurrent && currentHistoryIndex >= 0) {
        // Keep only actions up to current position
        actionHistory.splice(currentHistoryIndex + 1);
      } else {
        // Clear everything
        actionHistory.length = 0;
        currentHistoryIndex = -1;
      }
    },

    /**
     * Get statistics about command usage
     * @returns {Object} Statistics about action history
     */
    getStatistics() {
      const stats = {
        totalActions: actionHistory.length,
        currentPosition: currentHistoryIndex,
        actionTypes: {},
        oldestAction: null,
        newestAction: null
      };
      
      // Count action types
      actionHistory.forEach(action => {
        const type = action.type || 'UNKNOWN';
        stats.actionTypes[type] = (stats.actionTypes[type] || 0) + 1;
      });
      
      // Get oldest and newest actions
      if (actionHistory.length > 0) {
        stats.oldestAction = actionHistory[0].getMetadata?.() || actionHistory[0];
        stats.newestAction = actionHistory[actionHistory.length - 1].getMetadata?.() || actionHistory[actionHistory.length - 1];
      }
      
      return stats;
    }
  };
};


