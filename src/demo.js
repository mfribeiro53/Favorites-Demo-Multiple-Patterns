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
import { escapeHTML as escapeHTMLUtil, escapeAttr as escapeAttrUtil, normalizeUrl as normalizeUrlUtil, deriveDisplayName } from './utils/url-display.js';

// Import database service for real data persistence
import { 
  getAllResources, 
  getFrequentlyVisited, 
  getUserFavorites 
} from './database-service.js';

// =============================================================================
// =============================================================================
// DATABASE-DRIVEN DATA LOADING
// =============================================================================
// Data is loaded directly from the SQL Server database via API calls.
// The database service handles:
// - REST API calls to stored procedures
// - Connection pooling and error handling  
// - Real-time data persistence

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
    
    // Load and sync favorites from database
    await syncFavoritesFromDatabase();
    
    // Trigger initial render with loaded data
    triggerInitialRender();
    
  } catch (error) {
    console.error('💥 Failed to load application data - database required:', error.message);
    
    // Show error to user
    showStatus('Database connection required - please ensure API server is running', false);
    
    // Set empty arrays 
    allResources = [];
    frequentlyVisited = [];
    
    // Still trigger render to show empty state
    triggerInitialRender();
  }
}

/**
 * Sync favorites from database to local store
 */
async function syncFavoritesFromDatabase() {
  try {
    console.log('🔄 Syncing favorites from database...');
    
    // Get favorites from database
    const dbFavorites = await getUserFavorites();
    console.log(`✅ Loaded ${dbFavorites.length} favorites from database`);
    
    // Create a set from database favorites and restore to state
    if (dbFavorites.length > 0) {
      const favoritesSet = new Set(dbFavorites);
      
      // Use public hydrate API for initial sync (silent by default)
      if (favoritesStore.hydrate) {
        favoritesStore.hydrate(favoritesSet, { notify: false });
        console.log(`Synced ${dbFavorites.length} favorites from database to local state`);
      } else {
        // Fallback: add them one by one (will trigger database calls but should be idempotent)
        console.log('Using fallback sync method...');
        for (const url of dbFavorites) {
          if (!favoritesStore.isFavorite(url)) {
            // This will trigger database calls, but since the items are already in DB,
            // the add operations should return false (already exists) quickly
            await favoritesStore.addFavorite(url);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Failed to sync favorites from database:', error.message);
    // Continue anyway - app will work with empty favorites
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
  const fullUrl = normalizeUrlUtil(url);
    const urlObj = new URL(fullUrl);
    
    // Strategy 1: Try to use a title extraction service (when available)
    // Add timeout and a single retry for robustness
    const fetchWithTimeout = (resource, opts = {}, ms = 2500) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), ms);
      return fetch(resource, { ...opts, signal: controller.signal })
        .finally(() => clearTimeout(id));
    };

    const tryTitleServer = async () => {
      const titleServerUrl = `http://localhost:3001/api/page-title?url=${encodeURIComponent(fullUrl)}`;
      try {
        const response = await fetchWithTimeout(titleServerUrl, {}, 2500);
        if (response.ok) {
          const data = await response.json();
          if (data.title) {
            pageTitleCache.set(url, data.title);
            return data.title;
          }
        }
      } catch (err) {
        // swallow, we'll fallback below
      }
      return null;
    };

    let serverTitle = await tryTitleServer();
    if (!serverTitle) {
      // one retry with slightly longer timeout
      serverTitle = await tryTitleServer();
    }
    if (serverTitle) return serverTitle;
    
    // Strategy 2: Create intelligent display names based on URL structure
  let displayName = deriveDisplayName(fullUrl);
    
    // Strategy 3: Pure client-side path-based enhancement (no network probe)
  // deriveDisplayName already applied path-based enhancement
    
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
  const normalizedUrl = normalizeUrlUtil(url);
  
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
 * Security: All dynamic content is escaped via helpers to prevent XSS.
 * Buttons carry data via attributes and are wired with event delegation
 * to avoid embedding user-controlled strings in inline JavaScript.
 */
// SECURITY HELPERS: Escape HTML/attribute content to prevent XSS
// These helpers are used whenever user-controlled strings are rendered
// to ensure the DOM is not populated with unsafe HTML.
const escapeHTML = (str) => String(escapeHTMLUtil(str))
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')
  .replace(/`/g, '&#96;');

const escapeAttr = (str) => escapeAttrUtil(str);

// PERFORMANCE/A11Y HELPER: Update a star button's UI/state
const setStarState = (btn, isFav) => {
  if (!btn) return;
  const name = btn.getAttribute('data-name') || 'item';
  const actionVerb = isFav ? 'Remove from favorites' : 'Add to favorites';
  const ariaPressed = isFav ? 'true' : 'false';
  const starClassFav = 'favorited';
  const starClassNot = 'not-favorited';
  btn.classList.remove(isFav ? starClassNot : starClassFav);
  btn.classList.add(isFav ? starClassFav : starClassNot);
  btn.setAttribute('aria-pressed', ariaPressed);
  const label = `${actionVerb}: ${name}`;
  btn.setAttribute('aria-label', label);
  btn.setAttribute('title', label);
  btn.textContent = isFav ? '★' : '☆';
};

const createResourceHtml = (resource, isFav) => {
  // CONDITIONAL STYLING: Different CSS classes based on favorite status
  const starClass = isFav ? 'favorited' : 'not-favorited';
  
  // Escape display fields first (used in aria-label/title and text)
  const safeName = escapeHTML(resource.name);
  const safeUrl = escapeHTML(resource.url);
  
  // ACCESSIBILITY: Descriptive label and state
  const actionVerb = isFav ? 'Remove from favorites' : 'Add to favorites';
  const ariaPressed = isFav ? 'true' : 'false';
  const ariaLabel = `${actionVerb}: ${safeName}`;
  
  // INTERACTIVE ELEMENT: Button marked for event delegation (no inline JS)
  // The URL is stored in a data attribute and handled by a single
  // document-level click listener for .star-toggle.
  // Avoid embedding user data into JS; use a data attribute and event delegation
  const starButton = `<button class="star-toggle ${starClass}" data-url="${escapeAttr(resource.url)}" data-name="${escapeAttr(resource.name)}" aria-label="${ariaLabel}" aria-pressed="${ariaPressed}" title="${ariaLabel}">${isFav ? '★' : '☆'}</button>`;
  
  // SEMANTIC HTML: Proper list item structure with meaningful content
  // All displayed text is escaped to prevent injection.
  return `<li class="resource-item">
    <span>${safeName} (${safeUrl})</span>
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
const toggleFavorite = async (url) => {
  try {
    // CONDITIONAL LOGIC: Use store to determine current state
    if (favoritesStore.isFavorite(url)) {
      // URL is currently favorited, so remove it
      await favoritesStore.removeFavorite(url);
    } else {
      // URL is not favorited, so add it
      await favoritesStore.addFavorite(url);
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
  const list = container.querySelector('ul');
  const expectedLength = allResources.length;
  if (list && list.children.length === expectedLength) {
    // Fast path: update star states in place
    const buttons = list.querySelectorAll('button.star-toggle');
    const byUrl = new Map();
    buttons.forEach(btn => {
      const url = btn.getAttribute('data-url');
      if (url) byUrl.set(url, btn);
    });
    allResources.forEach(res => {
      const btn = byUrl.get(res.url);
      if (btn) setStarState(btn, currentFavorites.has(res.url));
    });
  } else {
    // Full render path
    container.innerHTML = `<h2>All Resources</h2><ul>${
      allResources.map(res => createResourceHtml(res, currentFavorites.has(res.url))).join('')
    }</ul>`;
  }
    
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
  // PERFORMANCE: Skip re-render if favorite set unchanged since last render
  const signature = `size:${currentFavorites.size}|${Array.from(currentFavorites).sort().join('|')}`;
  if (container.__lastSignature === signature) {
    return;
  }
  
  // CONDITIONAL RENDERING: Different UI for empty vs populated state
  if (currentFavorites.size === 0) {
    // EMPTY STATE: User-friendly message when no favorites exist
    container.innerHTML = `<h2>Favorites (${currentFavorites.size})</h2><p><em>No favorites selected</em></p>`;
  } else {
    // LOADING STATE: Show loading message while processing URLs
  container.innerHTML = `<h2>Favorites (${currentFavorites.size})</h2><p><em>Processing URLs...</em></p>`;
  container.setAttribute('aria-busy', 'true');
    
    // POPULATED STATE: Show ALL favorited resources with page titles
    try {
      // Convert Set to Array to map over all favorited URLs
      const favoriteUrlsArray = Array.from(currentFavorites);
      
      // Fetch resource objects with titles for all favorites
      const favoriteResourcesPromises = favoriteUrlsArray.map(url => createResourceFromUrl(url));
      const favoriteResources = await Promise.all(favoriteResourcesPromises);
      
  // Sort favorites deterministically by display name for stable UI
  favoriteResources.sort((a, b) => a.name.localeCompare(b.name));

  // Render all favorited resources with their fetched titles
      // Note: We pass 'true' for isFav since all items in this list are favorites
  container.innerHTML = `<h2>Favorites (${currentFavorites.size})</h2><ul>${
        favoriteResources.map(res => createResourceHtml(res, true)).join('')
      }</ul>`;
  container.removeAttribute('aria-busy');
  container.__lastSignature = signature;
      
    } catch (error) {
      // ERROR HANDLING: Show error message if title fetching fails
      console.error('Error fetching page titles:', error);
  container.innerHTML = `<h2>Favorites (${currentFavorites.size})</h2><p><em>Error loading page titles</em></p>`;
  container.removeAttribute('aria-busy');
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
  const list = container.querySelector('ul');
  const expectedLength = frequentlyVisited.length;
  if (list && list.children.length === expectedLength) {
    const buttons = list.querySelectorAll('button.star-toggle');
    const byUrl = new Map();
    buttons.forEach(btn => {
      const url = btn.getAttribute('data-url');
      if (url) byUrl.set(url, btn);
    });
    frequentlyVisited.forEach(res => {
      const btn = byUrl.get(res.url);
      if (btn) setStarState(btn, currentFavorites.has(res.url));
    });
  } else {
    // TEMPLATE GENERATION: Similar to other lists but using different data source
    // This shows how the same rendering pattern can be reused for different data
    container.innerHTML = `<h2>Frequently Visited</h2><ul>${
      frequentlyVisited.map(res => createResourceHtml(res, currentFavorites.has(res.url))).join('')
    }</ul>`;
  }
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
 * - Security: appends TextNodes (no innerHTML concatenation)
 */
const log = (message) => {
  // DOM MANIPULATION: Get the logs container
  const logsDiv = document.getElementById('logs');
    
  // TIMESTAMP: Add current time for debugging
  const timestamp = new Date().toLocaleTimeString();
    
  // APPEND MESSAGE: Use text nodes to avoid HTML injection
  const entry = document.createTextNode(`[${timestamp}] ${String(message)}\n`);
  logsDiv.appendChild(entry);
    
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
const addFavorite = async () => {
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
        
        // STORE UPDATE: Add to favorites (this triggers observer notifications and database save)
        const success = await favoritesStore.addFavorite(url);
        
        if (success) {
            // USER FEEDBACK: Show success message
            showStatus(`Added "${url}" to favorites`, true);
            
            // UI CLEANUP: Clear the input field for next entry
            document.getElementById('urlInput').value = '';
        } else {
            showStatus('Failed to add favorite', false);
        }
        
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
const removeFavorite = async () => {
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
        
        // STORE UPDATE: Remove from favorites (triggers observer notifications and database removal)
        const success = await favoritesStore.removeFavorite(url);
        
        if (success) {
            // USER FEEDBACK: Confirm the removal
            showStatus(`Removed "${url}" from favorites`, true);
            
            // UI CLEANUP: Clear input for next action
            document.getElementById('urlInput').value = '';
        } else {
            showStatus('Failed to remove favorite', false);
        }
        
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
const clearAll = async () => {
    try {
        // EMPTY STATE CHECK: Provide helpful feedback if nothing to clear
        if (favoritesStore.getCount() === 0) {
            showStatus('No favorites to clear', false);
            return;
        }
        
        // BULK OPERATION: Clear all favorites at once
        // This is more efficient than calling removeFavorite() multiple times
        // The store sends ONE notification instead of many and clears database
        const success = await favoritesStore.clearAll();
        
        if (success) {
            // USER FEEDBACK: Confirm the bulk operation
            showStatus('Cleared all favorites', true);
        } else {
            showStatus('Failed to clear favorites', false);
        }
        
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
let __statusTimeoutId;
const showStatus = (message, isPositive) => {
  // DOM MANIPULATION: Get the status display element
  const statusDiv = document.getElementById('status');
  if (!statusDiv) return;
  
  // ACCESSIBILITY: live region for announcements
  statusDiv.setAttribute('role', 'status');
  statusDiv.setAttribute('aria-live', 'polite');
  
  // MESSAGE DISPLAY: Set the text content
  statusDiv.textContent = String(message);
  
  // VISUAL FEEDBACK: Apply appropriate CSS class for styling
  // 'positive' class = green styling, 'negative' class = red styling
  statusDiv.className = `status ${isPositive ? 'positive' : 'negative'}`;
  
  // AUTO-HIDE: Clear the message after 3 seconds
  // Cancel any pending hide to avoid overlaps
  if (__statusTimeoutId) clearTimeout(__statusTimeoutId);
  __statusTimeoutId = setTimeout(() => {
    statusDiv.textContent = '';
    statusDiv.className = 'status'; // Reset to default styling
    statusDiv.removeAttribute('role');
    statusDiv.removeAttribute('aria-live');
    __statusTimeoutId = undefined;
  }, 3000);
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

// EVENT DELEGATION: Handle star button toggles via a single listener
// This replaces inline onclick handlers and avoids injecting user data into JS.
document.addEventListener('click', (e) => {
  const target = e.target;
  if (target && target.classList && target.classList.contains('star-toggle')) {
    const url = target.getAttribute('data-url');
    if (url) {
      // Call the existing toggleFavorite handler
      toggleFavorite(url);
    }
  }
});

// =============================================================================
// GLOBAL FUNCTION EXPOSURE FOR HTML ONCLICK HANDLERS
// =============================================================================
// Since we're using ES6 modules, functions are not automatically global.
// Only expose functions still used by static page controls.
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
const undoAction = async () => {
    try {
        const wasUndone = await favoritesStore.undo();
        
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
const redoAction = async () => {
    try {
        const wasRedone = await favoritesStore.redo();
        
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
        
    // ACTION DISPLAY: Show action description with visual indicators (escaped)
        historyHtml += `<div class="${itemClass}">
      ${index + 1}. ${escapeHTML(action.description)}`;
        
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
