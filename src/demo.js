/**
 * =============================================================================
 * DEMO APPLICATION - DESIGN PATTERNS IN ACTION
 * =============================================================================
 * 
 * This file demonstrates how to USE the design patterns implemented in the
 * favorites store. It shows practical examples of:
 * 
 * 1. OBSERVER PATTERN USAGE: How UI components subscribe to state changes
 * 2. COMMAND PATTERN USAGE: Undo/redo functionality and action history
 * 3. SEPARATION OF CONCERNS: Each component has a single responsibility
 * 4. REACTIVE PROGRAMMING: UI automatically updates when data changes
 * 5. ERROR HANDLING: Graceful handling of user input and store errors
 * 6. COMPONENT ARCHITECTURE: Modular, reusable UI components
 * 
 * Key Learning Points:
 * - How to structure UI components that react to state changes
 * - How to implement undo/redo functionality using Command Pattern
 * - How to handle user interactions and update shared state
 * - How to implement logging and debugging for observer patterns
 * - How to create maintainable, scalable frontend architecture
 * - How to provide rich user interactions with reversible actions
 */

// =============================================================================
// MODERN MODULE IMPORTS
// =============================================================================
// Import the store from the new modular architecture
// This demonstrates how clean module separation improves dependency management
import { favoritesStore } from './favorites-store-modular.js';

// Import database service for real data persistence
import { 
  getAllResources, 
  getFrequentlyVisited, 
  getUserFavorites 
} from './database-service.js';

// =============================================================================
// DATABASE-DRIVEN DATA LOADING
// =============================================================================
// Data is loaded directly from the SQL Server database via API calls.
// The database service handles:
// - REST API calls to stored procedures
// - Connection pooling and error handling  
// - Real-time data persistence
// - No fallback data - database connection required

// Global variables to hold dynamically loaded data
let allResources = [];
let frequentlyVisited = [];

/**
 * Load data from database on application startup
 */
async function loadApplicationData() {
  try {
    console.log('🔄 Loading application data from database...');
    
    // Load all resources from database
    allResources = await getAllResources();
    console.log(`✅ Loaded ${allResources.length} resources`);
    
    // Load frequently visited from database
    frequentlyVisited = await getFrequentlyVisited();
    console.log(`✅ Loaded ${frequentlyVisited.length} frequently visited items`);
    
    // Trigger initial render with loaded data
    triggerInitialRender();
    
  } catch (error) {
    console.error('💥 Failed to load application data - database required:', error.message);
    
    // Don't provide fallback data - show error to user
    showStatus('Database connection required - please ensure API server is running', false);
    
    // Set empty arrays 
    allResources = [];
    frequentlyVisited = [];
    
    // Still trigger render to show empty state
    triggerInitialRender();
  }
}

/**
 * Trigger initial render of all components
 */
function triggerInitialRender() {
  // Get current favorites from store and trigger render
  const currentFavorites = favoritesStore.getAllFavorites();
  const favoritesSet = new Set(currentFavorites);
  
  // Manually trigger all observer functions with current state
  renderResourceList(favoritesSet);
  renderFavoritesList(favoritesSet);
  renderFrequentlyVisitedList(favoritesSet);
}

// =============================================================================
// UTILITY FUNCTIONS - REUSABLE UI HELPERS
// =============================================================================

/**
 * UTILITY FUNCTION: Fetch page title from a URL
 * 
 * @param {string} url - The URL to fetch the title from
 * @returns {Promise<string>} Promise that resolves to the page title or fallback name
 * 
 * Design Principles:
 * - ASYNCHRONOUS: Uses multiple strategies for title fetching
 * - ERROR HANDLING: Graceful fallback if fetch fails
 * - CROSS-ORIGIN AWARE: Handles CORS limitations with alternatives
 * - PERFORMANCE: Caches results to avoid repeated requests
 * 
 * Note: Due to CORS policies, direct fetching from external sites is limited.
 * This function provides fallbacks for a better user experience.
 */
const pageTitleCache = new Map(); // Cache to avoid repeated requests

const fetchPageTitle = async (url) => {
  // Return cached result if available
  if (pageTitleCache.has(url)) {
    return pageTitleCache.get(url);
  }

  try {
    // Ensure URL has protocol
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(fullUrl);
    
    // Strategy 1: Try to use a title extraction service (when available)
    // Check if our title extraction server is running
    try {
      const titleServerUrl = `http://localhost:3001/api/page-title?url=${encodeURIComponent(fullUrl)}`;
      const response = await fetch(titleServerUrl);
      
      if (response.ok) {
        const data = await response.json();
        if (data.title) {
          pageTitleCache.set(url, data.title);
          return data.title;
        }
      }
    } catch (serverError) {
      // Title server not available, fall back to client-side extraction
      console.log('Title server not available, using fallback method');
    }
    
    // Strategy 2: Create intelligent display names based on URL structure
    let displayName = urlObj.hostname;
    
    // Remove 'www.' prefix for cleaner display
    if (displayName.startsWith('www.')) {
      displayName = displayName.substring(4);
    }
    
    // Capitalize first letter and handle common domains
    const domainParts = displayName.split('.');
    if (domainParts.length >= 2) {
      const mainDomain = domainParts[domainParts.length - 2];
      
      // Special handling for well-known domains
      const knownDomains = {
        'ups': 'UPS',
        'fedex': 'FedEx',
        'github': 'GitHub',
        'google': 'Google',
        'youtube': 'YouTube',
        'wikipedia': 'Wikipedia',
        'facebook': 'Facebook',
        'twitter': 'Twitter',
        'linkedin': 'LinkedIn',
        'amazon': 'Amazon',
        'microsoft': 'Microsoft',
        'apple': 'Apple',
        'netflix': 'Netflix'
      };
      
      displayName = knownDomains[mainDomain.toLowerCase()] || 
                   mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
      
      // Add domain extension context if it's not .com
      const extension = domainParts[domainParts.length - 1];
      if (extension !== 'com') {
        displayName += ` (.${extension})`;
      }
    }
    
    // Strategy 3: Try iframe approach for same-origin or CORS-enabled sites
    // This is a fallback that might work for some sites
    try {
      const response = await fetch(fullUrl, {
        method: 'HEAD', // Just check if the site is accessible
        mode: 'no-cors'
      });
      
      // If we get here without error, the site exists
      // For demo purposes, we'll enhance the display name
      if (urlObj.pathname && urlObj.pathname !== '/') {
        const pathParts = urlObj.pathname.split('/').filter(part => part);
        if (pathParts.length > 0) {
          // Add context from URL path
          let lastPart = pathParts[pathParts.length - 1];
          
          // Remove file extensions for cleaner display
          if (lastPart.includes('.')) {
            lastPart = lastPart.split('.')[0];
          }
          
          // Skip common home/index page names
          const skipParts = ['index', 'home', 'default', 'main'];
          
          if (lastPart && !skipParts.includes(lastPart.toLowerCase())) {
            displayName += ` - ${lastPart.charAt(0).toUpperCase() + lastPart.slice(1)}`;
          }
        }
      }
    } catch (corsError) {
      // Expected for most external sites - just use our smart domain name
    }
    
    pageTitleCache.set(url, displayName);
    return displayName;
    
  } catch (error) {
    // Final fallback: use the original URL
    console.log(`Could not process URL ${url}:`, error.message);
    const fallbackName = url;
    pageTitleCache.set(url, fallbackName);
    return fallbackName;
  }
};

/**
 * UTILITY FUNCTION: Get display name for a resource (with title fetching)
 * 
 * @param {string} url - The URL to get display name for
 * @returns {Promise<Object>} Promise that resolves to resource object with name
 */
const createResourceFromUrl = async (url) => {
  // Ensure URL has proper protocol for consistency
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
  
  // Check if this URL exists in our predefined resources first
  const predefinedResource = allResources.find(res => 
    res.url === normalizedUrl || res.url === url || 
    res.url.replace(/^https?:\/\//, '') === url.replace(/^https?:\/\//, '')
  );
  
  if (predefinedResource) {
    // Use the predefined resource's display name but with normalized URL
    return { url: normalizedUrl, name: predefinedResource.name };
  } else {
    // Fetch the page title for user-added URLs
    const displayName = await fetchPageTitle(normalizedUrl);
    return { url: normalizedUrl, name: displayName };
  }
};

/**
 * UTILITY FUNCTION: Generate HTML for a single resource item
 * 
 * @param {Object} resource - The resource object {url, name}
 * @param {boolean} isFav - Whether this resource is currently favorited
 * @returns {string} HTML string for the resource item
 * 
 * Design Principles Demonstrated:
 * - SINGLE RESPONSIBILITY: Only handles HTML generation for one item
 * - PURE FUNCTION: Same inputs always produce same output
 * - NO SIDE EFFECTS: Doesn't modify global state or DOM directly
 * - TEMPLATE GENERATION: Separates data from presentation
 * 
 * Security Note: In production, you'd want to escape HTML to prevent XSS
 */
const createResourceHtml = (resource, isFav) => {
  // CONDITIONAL STYLING: Different CSS classes based on favorite status
  const starClass = isFav ? 'favorited' : 'not-favorited';
  
  // INTERACTIVE ELEMENT: Button with onclick handler for toggling
  // The onclick calls toggleFavorite() with the resource URL
  const starButton = `<button onclick="toggleFavorite('${resource.url}')" class="${starClass}">${isFav ? '★' : '☆'}</button>`;
  
  // SEMANTIC HTML: Proper list item structure with meaningful content
  return `<li class="resource-item">
    <span>${resource.name} (${resource.url})</span>
    ${starButton}
  </li>`;
};

/**
 * EVENT HANDLER: Toggle favorite status for a resource
 * 
 * @param {string} url - The URL to toggle
 * 
 * Design Patterns Demonstrated:
 * - COMMAND PATTERN: Encapsulates the toggle operation
 * - ERROR HANDLING: Graceful handling of store errors
 * - STATE MANAGEMENT: Uses the store as single source of truth
 * 
 * Flow:
 * 1. Check current state
 * 2. Call appropriate store method
 * 3. Store automatically notifies all observers
 * 4. UI updates reactively
 */
const toggleFavorite = (url) => {
  try {
    // CONDITIONAL LOGIC: Use store to determine current state
    if (favoritesStore.isFavorite(url)) {
      // URL is currently favorited, so remove it
      favoritesStore.removeFavorite(url);
    } else {
      // URL is not favorited, so add it
      favoritesStore.addFavorite(url);
    }
    
    // Note: No manual UI updates needed!
    // The observer pattern automatically updates all UI components
    
  } catch (error) {
    // DEFENSIVE PROGRAMMING: Handle any errors gracefully
    showStatus(`Error toggling favorite: ${error.message}`, false);
  }
};

// =============================================================================
// UI COMPONENT FUNCTIONS - OBSERVER PATTERN IN ACTION
// =============================================================================
// These functions are the "Observers" in the Observer Pattern.
// Each one will be called automatically when the favorites store state changes.
// This demonstrates reactive programming - UI updates automatically based on data.

/**
 * UI COMPONENT: Render the complete list of all available resources
 * 
 * @param {Set} currentFavorites - Current state from the favorites store
 * 
 * Observer Pattern Role: This function is an OBSERVER
 * - It subscribes to the favorites store
 * - Gets called automatically when favorites change
 * - Updates its portion of the UI based on current state
 * 
 * Responsibilities:
 * - Show ALL resources (favorited and non-favorited)
 * - Display star buttons that reflect current favorite status
 * - Provide interactive controls for toggling favorites
 */
const renderResourceList = (currentFavorites) => {
  // DOM MANIPULATION: Get the container element for this component
  const container = document.getElementById('resource-list');
  
  // DYNAMIC HTML GENERATION: Build the entire component HTML
  // - Map over all resources
  // - For each resource, check if it's in the currentFavorites Set
  // - Generate HTML using our utility function
  // - Join all HTML strings together
  container.innerHTML = `<h2>All Resources</h2><ul>${
    allResources.map(res => createResourceHtml(res, currentFavorites.has(res.url))).join('')
  }</ul>`;
    
  // Note: No return value needed - this function produces side effects (DOM updates)
};

/**
 * UI COMPONENT: Render only the favorited resources
 * 
 * @param {Set} currentFavorites - Current state from the favorites store
 * 
 * Observer Pattern Role: This function is an OBSERVER
 * - Independent component that reacts to store changes
 * - Shows all favorited items with fetched page titles
 * - Handles empty state gracefully
 * 
 * Responsibilities:
 * - Show ALL favorited resources (predefined + user-added)
 * - Fetch and display page titles for user-added URLs
 * - Display count in the header
 * - Handle empty state with appropriate message
 * - Provide same interactive controls as main list
 */
const renderFavoritesList = async (currentFavorites) => {
  // DOM MANIPULATION: Get the container for favorites display
  const container = document.getElementById('favorites-list');
  
  // CONDITIONAL RENDERING: Different UI for empty vs populated state
  if (currentFavorites.size === 0) {
    // EMPTY STATE: User-friendly message when no favorites exist
    container.innerHTML = `<h2>Favorites (${currentFavorites.size})</h2><p><em>No favorites selected</em></p>`;
  } else {
    // LOADING STATE: Show loading message while processing URLs
    container.innerHTML = `<h2>Favorites (${currentFavorites.size})</h2><p><em>Processing URLs...</em></p>`;
    
    // POPULATED STATE: Show ALL favorited resources with page titles
    try {
      // Convert Set to Array to map over all favorited URLs
      const favoriteUrlsArray = Array.from(currentFavorites);
      
      // Fetch resource objects with titles for all favorites
      const favoriteResourcesPromises = favoriteUrlsArray.map(url => createResourceFromUrl(url));
      const favoriteResources = await Promise.all(favoriteResourcesPromises);
      
      // Render all favorited resources with their fetched titles
      // Note: We pass 'true' for isFav since all items in this list are favorites
      container.innerHTML = `<h2>Favorites (${currentFavorites.size})</h2><ul>${
        favoriteResources.map(res => createResourceHtml(res, true)).join('')
      }</ul>`;
      
    } catch (error) {
      // ERROR HANDLING: Show error message if title fetching fails
      console.error('Error fetching page titles:', error);
      container.innerHTML = `<h2>Favorites (${currentFavorites.size})</h2><p><em>Error loading page titles</em></p>`;
    }
  }
};

/**
 * UI COMPONENT: Render frequently visited resources with favorite status
 * 
 * @param {Set} currentFavorites - Current state from the favorites store
 * 
 * Observer Pattern Role: This function is an OBSERVER
 * - Shows a different subset of data (frequently visited)
 * - Demonstrates how multiple views can coexist
 * - Each view reacts independently to state changes
 * 
 * Responsibilities:
 * - Show frequently visited resources (predefined list)
 * - Indicate which ones are currently favorited
 * - Provide interactive controls for favoriting
 */
const renderFrequentlyVisitedList = (currentFavorites) => {
  // DOM MANIPULATION: Get container for frequently visited display
  const container = document.getElementById('frequent-list');
  
  // TEMPLATE GENERATION: Similar to other lists but using different data source
  // This shows how the same rendering pattern can be reused for different data
  container.innerHTML = `<h2>Frequently Visited</h2><ul>${
    frequentlyVisited.map(res => createResourceHtml(res, currentFavorites.has(res.url))).join('')
  }</ul>`;
};

// =============================================================================
// LOGGING AND DEBUGGING UTILITIES
// =============================================================================

/**
 * GLOBAL VARIABLE: Counter for observer notifications
 * Used to track how many times the store has notified observers.
 * Helpful for understanding the observer pattern in action.
 */
let logCounter = 0;

/**
 * UTILITY FUNCTION: Add timestamped log messages
 * 
 * @param {string} message - The message to log
 * 
 * Debugging Features:
 * - Timestamps for tracking when events occur
 * - Auto-scroll to show latest messages
 * - Visual feedback for observer pattern activity
 */
const log = (message) => {
    // DOM MANIPULATION: Get the logs container
    const logsDiv = document.getElementById('logs');
    
    // TIMESTAMP: Add current time for debugging
    const timestamp = new Date().toLocaleTimeString();
    
    // APPEND MESSAGE: Add new log entry (preserving previous entries)
    logsDiv.innerHTML += `[${timestamp}] ${message}\n`;
    
    // AUTO-SCROLL: Ensure latest messages are visible
    logsDiv.scrollTop = logsDiv.scrollHeight;
};

// =============================================================================
// OBSERVER PATTERN SETUP - WIRING UP THE REACTIVE SYSTEM
// =============================================================================
// This section demonstrates how to set up the Observer Pattern.
// Each subscribe() call registers a function to be called when state changes.

/**
 * OBSERVER REGISTRATION: Subscribe UI components to store changes
 * 
 * Observer Pattern Demonstration:
 * - Each function below is an "Observer"
 * - The favorites store is the "Subject"
 * - When store state changes, ALL observers are notified automatically
 * - Each observer updates its portion of the UI independently
 * 
 * Benefits:
 * - DECOUPLED: Components don't know about each other
 * - SCALABLE: Easy to add new UI components
 * - REACTIVE: UI automatically stays in sync with data
 * - MAINTAINABLE: Each component has single responsibility
 */

// COMPONENT SUBSCRIPTION: Register the "All Resources" list component
// This will be called every time favorites change
favoritesStore.subscribe(renderResourceList);

// COMPONENT SUBSCRIPTION: Register the "Favorites Only" list component
// This shows how different components can show different views of same data
favoritesStore.subscribe(renderFavoritesList);

// COMPONENT SUBSCRIPTION: Register the "Frequently Visited" component
// This demonstrates multiple independent observers
favoritesStore.subscribe(renderFrequentlyVisitedList);

/**
 * DEBUGGING OBSERVER: Track all state changes for development/learning
 * 
 * This observer doesn't update UI - it just logs activity.
 * Perfect for understanding when and how often the store changes.
 * In production, you might remove this or make it conditional.
 */
favoritesStore.subscribe((favorites) => {
    // INCREMENT COUNTER: Track how many notifications we've received
    logCounter++;
    
    // LOG THE CHANGE: Show what happened and current state size
    log(`Observer ${logCounter}: Store updated with ${favorites.size} favorites`);
    
    // UPDATE COMMAND PATTERN UI: Enable/disable undo/redo buttons
    updateUndoRedoButtons();
    
    // UPDATE ACTION HISTORY DISPLAY: Show current command history
    updateActionHistoryDisplay();
    
    // Note: This demonstrates that you can have multiple types of observers:
    // - UI updating observers (like the render functions above)
    // - Logging observers (like this one)
    // - Analytics observers (to track user behavior)
    // - Persistence observers (to save to localStorage/API)
    // - Command pattern UI updaters (like undo/redo button states)
});

// =============================================================================
// USER INTERACTION HANDLERS - CONNECTING UI TO STORE
// =============================================================================
// These functions handle user actions and update the store.
// The store then notifies all observers, which update the UI.

/**
 * USER ACTION HANDLER: Add a favorite from the input field
 * 
 * Flow:
 * 1. Get URL from input field
 * 2. Validate the input
 * 3. Update the store
 * 4. Store automatically notifies all observers
 * 5. All UI components update reactively
 * 6. Show user feedback
 */
const addFavorite = () => {
    // INPUT RETRIEVAL: Get value from the text input and clean it
    const url = document.getElementById('urlInput').value.trim();
    
    // INPUT VALIDATION: Check for empty input
    if (!url) {
        showStatus('Please enter a URL', false);
        return; // Early return prevents further execution
    }
    
    try {
        // DUPLICATE CHECK: Prevent adding the same URL twice
        if (favoritesStore.isFavorite(url)) {
            showStatus('URL is already in favorites', false);
            return;
        }
        
        // STORE UPDATE: Add to favorites (this triggers observer notifications)
        favoritesStore.addFavorite(url);
        
        // USER FEEDBACK: Show success message
        showStatus(`Added "${url}" to favorites`, true);
        
        // UI CLEANUP: Clear the input field for next entry
        document.getElementById('urlInput').value = '';
        
        // Note: No manual UI updates needed!
        // The observer pattern handles all UI updates automatically
        
    } catch (error) {
        // ERROR HANDLING: Show user-friendly error message
        showStatus(`Error adding favorite: ${error.message}`, false);
    }
};

/**
 * USER ACTION HANDLER: Remove a favorite from the input field
 * 
 * Similar flow to addFavorite but for removal:
 * 1. Get URL from input
 * 2. Validate input and check if it exists in favorites
 * 3. Remove from store
 * 4. Observer pattern handles UI updates
 * 5. Provide user feedback
 */
const removeFavorite = () => {
    // INPUT RETRIEVAL AND VALIDATION: Same pattern as addFavorite
    const url = document.getElementById('urlInput').value.trim();
    if (!url) {
        showStatus('Please enter a URL', false);
        return;
    }
    
    try {
        // EXISTENCE CHECK: Can't remove what's not there
        if (!favoritesStore.isFavorite(url)) {
            showStatus('URL is not in favorites', false);
            return;
        }
        
        // STORE UPDATE: Remove from favorites (triggers observer notifications)
        favoritesStore.removeFavorite(url);
        
        // USER FEEDBACK: Confirm the removal
        showStatus(`Removed "${url}" from favorites`, true);
        
        // UI CLEANUP: Clear input for next action
        document.getElementById('urlInput').value = '';
        
    } catch (error) {
        // ERROR HANDLING: Graceful error display
        showStatus(`Error removing favorite: ${error.message}`, false);
    }
};

/**
 * USER ACTION HANDLER: Clear all favorites at once
 * 
 * Bulk operation demonstrating:
 * - Batch updates (more efficient than removing one by one)
 * - Single observer notification for bulk change
 * - User confirmation through feedback
 */
const clearAll = () => {
    try {
        // EMPTY STATE CHECK: Provide helpful feedback if nothing to clear
        if (favoritesStore.getCount() === 0) {
            showStatus('No favorites to clear', false);
            return;
        }
        
        // BULK OPERATION: Clear all favorites at once
        // This is more efficient than calling removeFavorite() multiple times
        // The store sends ONE notification instead of many
        favoritesStore.clearAll();
        
        // USER FEEDBACK: Confirm the bulk operation
        showStatus('Cleared all favorites', true);
        
    } catch (error) {
        // ERROR HANDLING: Show any errors that occur
        showStatus(`Error clearing favorites: ${error.message}`, false);
    }
};

// =============================================================================
// USER FEEDBACK SYSTEM
// =============================================================================

/**
 * UTILITY FUNCTION: Show status messages to the user
 * 
 * @param {string} message - The message to display
 * @param {boolean} isPositive - Whether this is a success (true) or error (false)
 * 
 * UX Features:
 * - Color-coded messages (green for success, red for errors)
 * - Auto-disappearing messages (don't clutter the UI)
 * - Consistent feedback for all user actions
 */
const showStatus = (message, isPositive) => {
    // DOM MANIPULATION: Get the status display element
    const statusDiv = document.getElementById('status');
    
    // MESSAGE DISPLAY: Set the text content
    statusDiv.textContent = message;
    
    // VISUAL FEEDBACK: Apply appropriate CSS class for styling
    // 'positive' class = green styling, 'negative' class = red styling
    statusDiv.className = `status ${isPositive ? 'positive' : 'negative'}`;
    
    // AUTO-HIDE: Clear the message after 3 seconds
    // This prevents the UI from getting cluttered with old messages
    setTimeout(() => {
        statusDiv.textContent = '';
        statusDiv.className = 'status'; // Reset to default styling
    }, 3000); // 3000 milliseconds = 3 seconds
};

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================

/**
 * INITIALIZATION LOGS: Record that the application has started
 * 
 * These logs help developers understand the application lifecycle:
 * 1. Store is created and initialized
 * 2. All observers are subscribed
 * 3. Data is loaded from database
 * 4. Demo UI is ready for interaction
 * 
 * The fact that we see these logs confirms that:
 * - The store was created successfully
 * - The observer subscriptions worked
 * - The database integration is functioning
 * - The logging system is functioning
 */
log('Favorites store initialized');
log('Loading data from database...');

// Load application data from database
loadApplicationData().then(() => {
  log('Demo UI loaded and ready');
}).catch(error => {
  log('Demo UI loaded but database connection failed');
  console.error('Database error:', error.message);
});

// =============================================================================
// GLOBAL FUNCTION EXPOSURE FOR HTML ONCLICK HANDLERS
// =============================================================================
// Since we're using ES6 modules, functions are not automatically global.
// We need to explicitly expose them for HTML onclick handlers to work.

window.toggleFavorite = toggleFavorite;
window.addFavorite = addFavorite;
window.removeFavorite = removeFavorite;
window.clearAll = clearAll;
window.undoAction = undoAction;
window.redoAction = redoAction;

// =============================================================================
// COMMAND PATTERN FUNCTIONS - UNDO/REDO FUNCTIONALITY
// =============================================================================

/**
 * USER ACTION HANDLER: Undo the last action (Command Pattern)
 * 
 * Demonstrates:
 * - Command Pattern implementation
 * - Reversible operations
 * - User feedback for undo operations
 */
const undoAction = () => {
    try {
        const wasUndone = favoritesStore.undo();
        
        if (wasUndone) {
            showStatus('Action undone', true);
            log('User performed undo operation');
        } else {
            showStatus('Nothing to undo', false);
        }
    } catch (error) {
        showStatus(`Error during undo: ${error.message}`, false);
    }
};

/**
 * USER ACTION HANDLER: Redo the last undone action (Command Pattern)
 * 
 * Demonstrates:
 * - Command Pattern implementation
 * - Re-executing previous operations
 * - User feedback for redo operations
 */
const redoAction = () => {
    try {
        const wasRedone = favoritesStore.redo();
        
        if (wasRedone) {
            showStatus('Action redone', true);
            log('User performed redo operation');
        } else {
            showStatus('Nothing to redo', false);
        }
    } catch (error) {
        showStatus(`Error during redo: ${error.message}`, false);
    }
};

/**
 * UTILITY FUNCTION: Update undo/redo button states
 * 
 * This function demonstrates how the Command Pattern enables
 * rich UI interactions by providing state information.
 */
const updateUndoRedoButtons = () => {
    // GET BUTTON ELEMENTS: Access the undo/redo buttons
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    // CHECK AVAILABILITY: Use store methods to check what's possible
    const canUndo = favoritesStore.canUndo();
    const canRedo = favoritesStore.canRedo();
    
    // UPDATE BUTTON STATES: Enable/disable based on availability
    if (undoBtn) {
        undoBtn.disabled = !canUndo;
        // ACCESSIBILITY: Update title for screen readers
        undoBtn.title = canUndo ? 'Undo the last action' : 'No actions to undo';
    }
    
    if (redoBtn) {
        redoBtn.disabled = !canRedo;
        // ACCESSIBILITY: Update title for screen readers
        redoBtn.title = canRedo ? 'Redo the last undone action' : 'No actions to redo';
    }
};

/**
 * UTILITY FUNCTION: Update the action history display
 * 
 * Shows the Command Pattern history visually, helping users
 * understand what actions have been performed and can be undone/redone.
 */
const updateActionHistoryDisplay = () => {
    // GET CONTAINER: Access the action history display element
    const historyContainer = document.getElementById('action-history');
    if (!historyContainer) return;
    
    // GET HISTORY: Retrieve action history from the store
    const history = favoritesStore.getActionHistory();
    
    if (history.actions.length === 0) {
        // EMPTY STATE: Show message when no actions have been performed
        historyContainer.innerHTML = '<em>No actions performed yet</em>';
        return;
    }
    
    // BUILD HISTORY DISPLAY: Create visual representation of action history
    let historyHtml = `<div class="action-history-header">
        <strong>Actions: ${history.actions.length} | 
        Can Undo: ${history.canUndo} | Can Redo: ${history.canRedo}</strong>
    </div>`;
    
    // GENERATE ACTION LIST: Show each action with appropriate styling
    history.actions.forEach((action, index) => {
        let itemClass = 'action-history-item';
        
        // VISUAL INDICATORS: Different styles for different states
        if (index <= history.currentIndex) {
            itemClass += ' executed'; // Action has been executed
        } else {
            itemClass += ' undone';   // Action has been undone
        }
        
        if (index === history.currentIndex) {
            itemClass += ' current';  // Current position in history
        }
        
        // ACTION DISPLAY: Show action description with visual indicators
        historyHtml += `<div class="${itemClass}">
            ${index + 1}. ${action.description}`;
        
        if (index === history.currentIndex) {
            historyHtml += ' ← Current';
        } else if (index > history.currentIndex) {
            historyHtml += ' (Undone)';
        }
        
        historyHtml += '</div>';
    });
    
    // UPDATE DISPLAY: Set the generated HTML
    historyContainer.innerHTML = historyHtml;
};
