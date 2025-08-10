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
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './routes/api.js';
import webRouter from './routes/web.js';
import { initializeDatabase, closeDatabase } from './services/dbService.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// View engine setup (EJS)
app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'ejs');

// Routers
app.use('/api', apiRouter);
app.use('/', webRouter);

// Static assets (no index file here; EJS handles '/')
app.use(express.static(path.join(__dirname, '..'), { index: false }));

// Fallback to EJS index for non-API routes (Express 5-safe)
app.use((req, res, next) => {
  if (req.path && req.path.startsWith('/api/')) return next();
  // Only handle GET-like navigations; let others fall through
  if (req.method !== 'GET') return next();
  return res.render('index', { title: 'Favorites Store Demo' });
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
  await closeDatabase();
  console.log('📝 Database connection closed');
  process.exit(0);
});

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
