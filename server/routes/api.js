import { Router } from 'express';
import { testConnection } from '../controllers/healthController.js';
import {
  getAllResources,
  getFrequentlyVisited,
  getUserFavorites,
  addFavorite,
  removeFavorite,
  clearAllFavorites
} from '../controllers/favoritesController.js';

const router = Router();

// Health/test
router.post('/test-connection', testConnection);
router.post('/execute-procedure', async (req, res) => {
  // keep this simple pass-through if needed in future; removed to reduce surface area
  res.status(501).json({ error: 'Not implemented via router; use specific endpoints.' });
});

// Favorites and resources
router.get('/resources', getAllResources);
router.get('/frequently-visited', getFrequentlyVisited);
router.get('/favorites', getUserFavorites);
router.post('/favorites', addFavorite);
router.delete('/favorites', removeFavorite);
router.delete('/favorites/all', clearAllFavorites);

export default router;
