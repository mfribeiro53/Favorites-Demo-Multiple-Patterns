/**
 * =============================================================================
 * OBSERVER MANAGER - REACTIVE STATE NOTIFICATIONS
 * =============================================================================
 * 
 * This module is responsible for:
 * - Managing subscriber callbacks
 * - Notifying observers of state changes
 * - Error handling for subscriber callbacks
 * - Memory management (subscription cleanup)
 * 
 * Design Principles:
 * - Single Responsibility: Only manages observers
 * - Error Isolation: Failed subscribers don't break others
 * - Memory Safety: Provides cleanup mechanisms
 * - Defensive Programming: Validates all inputs
 */

/**
 * Creates an observer manager for handling state change notifications
 * 
 * @returns {Object} Observer manager with subscription methods
 */
export const createObserverManager = () => {
  // ==========================================================================
  // PRIVATE STATE
  // ==========================================================================
  
  /**
   * List of subscriber callback functions
   * Each function will be called when state changes occur
   */
  const subscribers = [];

  // ==========================================================================
  // OBSERVER MANAGEMENT
  // ==========================================================================
  
  return {
    /**
     * Subscribe to state changes
     * @param {Function} callback - Function to call on state changes
     * @param {*} initialState - Initial state to send to new subscriber
     */
    subscribe(callback, initialState = null) {
      if (typeof callback !== 'function') {
        throw new Error('Callback must be a function');
      }
      
      // Add to subscribers list
      subscribers.push(callback);
      
      // Immediately notify with current state if provided
      if (initialState !== null) {
        this.notifySubscriber(callback, initialState);
      }
      
      return callback; // Return for easy unsubscription
    },

    /**
     * Unsubscribe from state changes
     * @param {Function} callback - The callback to remove
     * @returns {boolean} True if callback was found and removed
     */
    unsubscribe(callback) {
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
        return true;
      }
      return false;
    },

    /**
     * Notify all subscribers of a state change
     * @param {*} newState - The new state to broadcast
     */
    notifyAll(newState) {
      // Create a copy of subscribers array to avoid issues if
      // a subscriber modifies the array during notification
      const currentSubscribers = [...subscribers];
      
      currentSubscribers.forEach(callback => {
        this.notifySubscriber(callback, newState);
      });
    },

    /**
     * Notify a single subscriber safely
     * @param {Function} callback - The subscriber to notify
     * @param {*} state - The state to send
     */
    notifySubscriber(callback, state) {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in subscriber callback:', error);
        console.error('Callback that failed:', callback.name || 'anonymous');
        
        // In production, you might want to:
        // - Remove the failing subscriber
        // - Send error reports to monitoring service
        // - Implement retry logic
      }
    },

    /**
     * Get the current number of subscribers
     * @returns {number} Number of active subscribers
     */
    getSubscriberCount() {
      return subscribers.length;
    },

    /**
     * Clear all subscribers (useful for cleanup)
     */
    clearAll() {
      subscribers.length = 0;
    },

    /**
     * Check if a callback is subscribed
     * @param {Function} callback - The callback to check
     * @returns {boolean} True if subscribed
     */
    isSubscribed(callback) {
      return subscribers.includes(callback);
    }
  };
};

// CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createObserverManager };
}
