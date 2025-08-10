import { executeStoredProcedure } from '../services/dbService.js';

export async function getAllResources(req, res) {
  try {
    const userId = parseInt(req.query.userId) || 1;
    const results = await executeStoredProcedure('FavoritesDemo.sp_GetAllResources', { userId });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getFrequentlyVisited(req, res) {
  try {
    const userId = parseInt(req.query.userId) || 1;
    const topCount = parseInt(req.query.topCount) || 10;
    const results = await executeStoredProcedure('FavoritesDemo.sp_GetFrequentlyVisited', { userId, topCount });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getUserFavorites(req, res) {
  try {
    const userId = parseInt(req.query.userId) || 1;
    const results = await executeStoredProcedure('FavoritesDemo.sp_GetUserFavorites', { userId });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function addFavorite(req, res) {
  try {
    const { url, displayName, userNotes } = req.body || {};
    const userId = req.body && req.body.userId ? parseInt(req.body.userId) : 1;
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'URL is required' });
    }
    const results = await executeStoredProcedure('FavoritesDemo.sp_AddFavorite', { userId, url, displayName, userNotes });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function removeFavorite(req, res) {
  try {
    const { url } = req.body || {};
    const userId = req.body && req.body.userId ? parseInt(req.body.userId) : 1;
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'URL is required' });
    }
    const results = await executeStoredProcedure('FavoritesDemo.sp_RemoveFavorite', { userId, url });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function clearAllFavorites(req, res) {
  try {
    const userId = req.body && req.body.userId ? parseInt(req.body.userId) : 1;
    const results = await executeStoredProcedure('FavoritesDemo.sp_ClearAllFavorites', { userId });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
