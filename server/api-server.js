/**
 * =============================================================================
 * SIMPLE API SERVER FOR DATABASE CALLS
 * =============================================================================
 * 
 * This Node.js server provides API endpoints that execute your stored procedures
 * and return the results as JSON. It bridges the gap between your frontend
 * JavaScript and the SQL Server database.
 * 
 * To use:
 * 1. Run: npm install express mssql cors
 * 2. Start: node server/api-server.js
 * 3. The frontend will call these endpoints
 */

import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Database configuration - SQL Server Authentication
const dbConfig = {
  server: 'localhost',
  port: 1433,
  database: 'TestNet_001',
  user: 'sa',
  password: 'Reza!546$%sun',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    useUTC: false
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Global connection pool
let pool;

/**
 * Initialize database connection pool
 */
async function initializeDatabase() {
  try {
    pool = await sql.connect(dbConfig);
    console.log('✅ Connected to SQL Server database');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

/**
 * Execute a stored procedure
 * @param {string} procedureName - Name of the stored procedure
 * @param {Object} parameters - Parameters for the procedure
 * @returns {Promise<Array>} Query results
 */
async function executeStoredProcedure(procedureName, parameters = {}) {
  try {
    const request = pool.request();
    
    // Add parameters based on the procedure
    switch (procedureName) {
      case 'FavoritesDemo.sp_GetAllResources':
        if (parameters.userId) request.input('UserId', sql.Int, parameters.userId);
        break;
        
      case 'FavoritesDemo.sp_GetFrequentlyVisited':
        if (parameters.userId) request.input('UserId', sql.Int, parameters.userId);
        if (parameters.topCount) request.input('TopCount', sql.Int, parameters.topCount);
        break;
        
      case 'FavoritesDemo.sp_GetUserFavorites':
        if (parameters.userId) request.input('UserId', sql.Int, parameters.userId);
        break;
        
      case 'FavoritesDemo.sp_AddFavorite':
        if (parameters.userId) request.input('UserId', sql.Int, parameters.userId);
        if (parameters.url) request.input('Url', sql.NVarChar(500), parameters.url);
        if (parameters.displayName) request.input('DisplayName', sql.NVarChar(200), parameters.displayName);
        if (parameters.userNotes) request.input('UserNotes', sql.NVarChar(1000), parameters.userNotes);
        break;
        
      case 'FavoritesDemo.sp_RemoveFavorite':
        if (parameters.userId) request.input('UserId', sql.Int, parameters.userId);
        if (parameters.url) request.input('Url', sql.NVarChar(500), parameters.url);
        break;
        
      case 'FavoritesDemo.sp_ClearAllFavorites':
        if (parameters.userId) request.input('UserId', sql.Int, parameters.userId);
        break;
        
      case 'FavoritesDemo.sp_IsFavorite':
        if (parameters.userId) request.input('UserId', sql.Int, parameters.userId);
        if (parameters.url) request.input('Url', sql.NVarChar(500), parameters.url);
        break;
        
      case 'FavoritesDemo.sp_GetFavoritesCount':
        if (parameters.userId) request.input('UserId', sql.Int, parameters.userId);
        break;
    }
    
    const result = await request.execute(procedureName);
    return result.recordset;
    
  } catch (error) {
    console.error(`Error executing ${procedureName}:`, error.message);
    throw error;
  }
}

// =============================================================================
// API ENDPOINTS
// =============================================================================

/**
 * Test database connection
 */
app.post('/api/test-connection', async (req, res) => {
  try {
    if (!pool) {
      const connected = await initializeDatabase();
      if (!connected) {
        return res.status(500).json({ error: 'Database connection failed' });
      }
    }
    
    res.json({ success: true, message: 'Database connected successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Execute any stored procedure
 */
app.post('/api/execute-procedure', async (req, res) => {
  try {
    const { procedure, parameters } = req.body;
    
    if (!pool) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const results = await executeStoredProcedure(procedure, parameters);
    res.json(results);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all resources
 */
app.get('/api/resources', async (req, res) => {
  try {
    const userId = parseInt(req.query.userId) || 1;
    const results = await executeStoredProcedure('FavoritesDemo.sp_GetAllResources', { userId });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get frequently visited
 */
app.get('/api/frequently-visited', async (req, res) => {
  try {
    const userId = parseInt(req.query.userId) || 1;
    const topCount = parseInt(req.query.topCount) || 10;
    const results = await executeStoredProcedure('FavoritesDemo.sp_GetFrequentlyVisited', { userId, topCount });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user favorites
 */
app.get('/api/favorites', async (req, res) => {
  try {
    const userId = parseInt(req.query.userId) || 1;
    const results = await executeStoredProcedure('FavoritesDemo.sp_GetUserFavorites', { userId });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add favorite
 */
app.post('/api/favorites', async (req, res) => {
  try {
    const { url, displayName, userNotes, userId = 1 } = req.body;
    const results = await executeStoredProcedure('FavoritesDemo.sp_AddFavorite', { 
      userId, url, displayName, userNotes 
    });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Remove favorite
 */
app.delete('/api/favorites', async (req, res) => {
  try {
    const { url, userId = 1 } = req.body;
    const results = await executeStoredProcedure('FavoritesDemo.sp_RemoveFavorite', { userId, url });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Clear all favorites
 */
app.delete('/api/favorites/all', async (req, res) => {
  try {
    const userId = parseInt(req.body.userId) || 1;
    const results = await executeStoredProcedure('FavoritesDemo.sp_ClearAllFavorites', { userId });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Serve the main application
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

/**
 * Get page title for URLs (for your fetchPageTitle function)
 */
app.get('/api/page-title', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter required' });
    }
    
    // Simple page title extraction
    // In production, you'd use a proper HTML parser
    const response = await fetch(url);
    const html = await response.text();
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;
    
    res.json({ title, url });
    
  } catch (error) {
    res.status(500).json({ error: error.message, url: req.query.url });
  }
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

async function startServer() {
  // Initialize database connection
  await initializeDatabase();
  
  // Start the server
  app.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
    console.log(`📊 Database API endpoints available at http://localhost:${PORT}/api/`);
    console.log(`🌐 Demo application available at http://localhost:${PORT}`);
    console.log('');
    console.log('Available endpoints:');
    console.log('  GET  /api/resources           - Get all resources');
    console.log('  GET  /api/frequently-visited  - Get frequently visited');
    console.log('  GET  /api/favorites           - Get user favorites');
    console.log('  POST /api/favorites           - Add favorite');
    console.log('  DELETE /api/favorites         - Remove favorite');
    console.log('  DELETE /api/favorites/all     - Clear all favorites');
    console.log('  GET  /api/page-title?url=...  - Get page title');
  });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  if (pool) {
    await pool.close();
    console.log('📝 Database connection closed');
  }
  process.exit(0);
});

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
