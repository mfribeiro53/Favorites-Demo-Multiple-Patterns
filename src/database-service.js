/**
 * =============================================================================
 * DATABASE SERVICE - SQL SERVER INTEGRATION
 * =============================================================================
 * 
 * This service layer provides database connectivity for the favorites store.
 * It wraps the stored procedures in clean JavaScript functions that match
 * the existing store interface, allowing seamless integration with the
 * Observer and Command patterns.
 * 
 * Design Principles:
 * - ASYNC/AWAIT: All database operations are asynchronous
 * - ERROR HANDLING: Graceful handling of connection and query errors
 * - CONSISTENCY: Returns data in same format as mock arrays
 * - CACHING: Optional caching layer for performance
 * - SEPARATION: Database logic isolated from business logic
 */

/**
 * DATABASE CONFIGURATION
 * In production, these would come from environment variables
 */
const DB_CONFIG = {
  server: 'localhost,1433',
  database: 'TestNet_001',
  schema: 'FavoritesDemo',
  userId: 1, // Default demo user
  timeout: 5000, // 5 second timeout
  retries: 3 // Number of retry attempts
};

/**
 * Cache for frequently accessed data
 * Helps reduce database calls for static data
 */
class DatabaseCache {
  constructor(ttlSeconds = 300) { // 5 minute default TTL
    this.cache = new Map();
    this.ttl = ttlSeconds * 1000;
  }
  
  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  clear() {
    this.cache.clear();
  }
  
  delete(key) {
    this.cache.delete(key);
  }
}

// Create cache instances
const allResourcesCache = new DatabaseCache(600); // 10 minutes for all resources
const frequentlyVisitedCache = new DatabaseCache(300); // 5 minutes for frequently visited
const userFavoritesCache = new DatabaseCache(60); // 1 minute for user favorites

/**
 * Execute SQL queries through REST API or direct connection
 * This connects to your actual SQL Server database
 */
class DatabaseService {
  constructor() {
    this.isConnected = false;
    this.connectionId = null;
  }
  
  /**
   * Connect to the actual SQL Server database
   */
  async connect() {
    try {
      console.log('🔌 Connecting to SQL Server...');
      
      // For this demo, we'll use fetch to call a local API endpoint
      // that executes the stored procedures
      const response = await fetch('http://localhost:3001/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: DB_CONFIG.server,
          database: DB_CONFIG.database
        })
      });
      
      if (response.ok) {
        this.isConnected = true;
        this.connectionId = 'sql-connection-' + Date.now();
        console.log('✅ Database connected successfully');
        return true;
      } else {
        throw new Error('Connection failed');
      }
      
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      this.isConnected = false;
      throw error; // Don't continue without database
    }
  }
  
  /**
   * Execute a stored procedure via API call
   * @param {string} procedureName - Name of the stored procedure
   * @param {Object} parameters - Parameters to pass to the procedure
   * @returns {Promise<Array>} Query results
   */
  async executeStoredProcedure(procedureName, parameters = {}) {
    try {
      console.log(`🔍 Executing: ${procedureName}`, parameters);
      
      // Try to call via API endpoint first
      const response = await fetch('http://localhost:3001/api/execute-procedure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procedure: procedureName,
          parameters: parameters
        })
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`API call failed: ${response.status}`);
      }
      
    } catch (error) {
      console.warn(`⚠️ API call failed for ${procedureName}:`, error.message);
      throw error; // Don't fallback, let the error propagate
    }
  }
  
  /**
   * Get fallback data when database is unavailable
   */
  async getFallbackData(procedureName, parameters) {
    // Fallback data removed - application requires database connection
    throw new Error(`Database required for ${procedureName}. No fallback data available.`);
  }
  /**
   * Simulate realistic database response times
   */
  async simulateDelay() {
    const delay = Math.random() * 100 + 50; // 50-150ms delay
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

// Create singleton database service instance
const dbService = new DatabaseService();

/**
 * =============================================================================
 * DATABASE API FUNCTIONS
 * =============================================================================
 * 
 * These functions provide clean interfaces to the stored procedures,
 * handling caching, error recovery, and data transformation.
 */

/**
 * Get all available resources (replaces allResources array)
 * @param {boolean} useCache - Whether to use cached data
 * @returns {Promise<Array>} Array of resource objects
 */
export const getAllResources = async (useCache = true) => {
  const cacheKey = 'all-resources';
  
  if (useCache) {
    const cached = allResourcesCache.get(cacheKey);
    if (cached) {
      console.log('📦 Using cached all resources');
      return cached;
    }
  }
  
  try {
    const response = await fetch('http://localhost:3001/api/resources');
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }
    
    const results = await response.json();
    
    // Transform to match existing structure
    const resources = results.map(row => ({
      url: row.Url,  // API returns 'Url', transform to 'url'
      name: row.name
    }));
    
    allResourcesCache.set(cacheKey, resources);
    return resources;
    
  } catch (error) {
    console.error('Failed to get all resources:', error);
    throw error; // No fallback - require database connection
  }
};

/**
 * Get frequently visited resources (replaces frequentlyVisited array)
 * @param {number} topCount - Number of top resources to return
 * @param {boolean} useCache - Whether to use cached data
 * @returns {Promise<Array>} Array of frequently visited resources
 */
export const getFrequentlyVisited = async (topCount = 10, useCache = true) => {
  const cacheKey = `frequently-visited-${topCount}`;
  
  if (useCache) {
    const cached = frequentlyVisitedCache.get(cacheKey);
    if (cached) {
      console.log('📦 Using cached frequently visited');
      return cached;
    }
  }
  
  try {
    const response = await fetch('http://localhost:3001/api/frequently-visited');
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }
    
    const results = await response.json();
    
    // Transform to match existing structure
    const resources = results.map(row => ({
      url: row.Url,  // API returns 'Url', transform to 'url'
      name: row.name
    }));
    
    frequentlyVisitedCache.set(cacheKey, resources);
    return resources;
    
  } catch (error) {
    console.error('Failed to get frequently visited:', error);
    throw error; // No fallback - require database connection
  }
};

/**
 * Get user's current favorites
 * @param {boolean} useCache - Whether to use cached data
 * @returns {Promise<Array>} Array of favorited URLs
 */
export const getUserFavorites = async (useCache = false) => {
  // Don't cache favorites by default as they change frequently
  const cacheKey = 'user-favorites';
  
  if (useCache) {
    const cached = userFavoritesCache.get(cacheKey);
    if (cached) {
      console.log('📦 Using cached user favorites');
      return cached;
    }
  }
  
  try {
    const response = await fetch('http://localhost:3001/api/favorites');
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }
    
    const results = await response.json();
    
    // Return just the URLs for compatibility with existing store
    const favoriteUrls = results.map(row => row.Url);  // API returns 'Url', transform to 'url'
    
    if (useCache) {
      userFavoritesCache.set(cacheKey, favoriteUrls);
    }
    
    return favoriteUrls;
    
  } catch (error) {
    console.error('Failed to get user favorites:', error);
    throw error; // No fallback - require database connection
  }
};

/**
 * Add a URL to favorites
 * @param {string} url - URL to add
 * @param {string} displayName - Optional display name
 * @param {string} userNotes - Optional user notes
 * @returns {Promise<boolean>} True if added successfully
 */
export const addFavorite = async (url, displayName = null, userNotes = null) => {
  try {
    const response = await fetch('http://localhost:3001/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, displayName, userNotes })
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      // Clear cache so next read gets fresh data
      userFavoritesCache.clear();
      console.log(`✅ ${result.message}`);
      return true;
    } else {
      console.log(`ℹ️ ${result.message}`);
      return false;
    }
    
  } catch (error) {
    console.error('Failed to add favorite:', error);
    throw error; // No fallback - require database connection
  }
};

/**
 * Remove a URL from favorites
 * @param {string} url - URL to remove
 * @returns {Promise<boolean>} True if removed successfully
 */
export const removeFavorite = async (url) => {
  try {
    const response = await fetch('http://localhost:3001/api/favorites', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      // Clear cache so next read gets fresh data
      userFavoritesCache.clear();
      console.log(`✅ ${result.message}`);
      return true;
    } else {
      console.log(`ℹ️ ${result.message}`);
      return false;
    }
    
  } catch (error) {
    console.error('Failed to remove favorite:', error);
    throw error; // No fallback - require database connection
  }
};

/**
 * Clear all favorites
 * @returns {Promise<boolean>} True if cleared successfully
 */
export const clearAllFavorites = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/favorites/all', {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      // Clear cache so next read gets fresh data
      userFavoritesCache.clear();
      console.log(`✅ ${result.message}`);
      return true;
    } else {
      console.log(`ℹ️ ${result.message}`);
      return false;
    }
    
  } catch (error) {
    console.error('Failed to clear favorites:', error);
    throw error; // No fallback - require database connection
  }
};

/**
 * Check if a URL is favorited
 * @param {string} url - URL to check
 * @returns {Promise<boolean>} True if favorited
 */
export const isFavorite = async (url) => {
  try {
    const results = await dbService.executeStoredProcedure('FavoritesDemo.sp_IsFavorite', {
      userId: DB_CONFIG.userId,
      url
    });
    
    return results[0].isFavorited;
    
  } catch (error) {
    console.error('Failed to check favorite status:', error);
    throw error; // No fallback - require database connection
  }
};

/**
 * Get count of user's favorites
 * @returns {Promise<number>} Number of favorites
 */
export const getFavoritesCount = async () => {
  try {
    const results = await dbService.executeStoredProcedure('FavoritesDemo.sp_GetFavoritesCount', {
      userId: DB_CONFIG.userId
    });
    
    return results[0].favoritesCount;
    
  } catch (error) {
    console.error('Failed to get favorites count:', error);
    throw error; // No fallback - require database connection
  }
};

/**
 * =============================================================================
 * CACHE MANAGEMENT
 * =============================================================================
 */

/**
 * Clear all caches
 */
export const clearAllCaches = () => {
  allResourcesCache.clear();
  frequentlyVisitedCache.clear();
  userFavoritesCache.clear();
  console.log('🗑️ All caches cleared');
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return {
    allResources: allResourcesCache.cache.size,
    frequentlyVisited: frequentlyVisitedCache.cache.size,
    userFavorites: userFavoritesCache.cache.size
  };
};

/**
 * =============================================================================
 * INITIALIZATION
 * =============================================================================
 */

// Initialize database connection when module loads
dbService.connect().then(() => {
  console.log('🚀 Database service initialized - ready for operations');
}).catch(error => {
  console.error('💥 Database service initialization failed - application requires database:', error.message);
  console.log('� Application will not function without database connection');
});

// Export the database service for advanced usage if needed
export { dbService };
