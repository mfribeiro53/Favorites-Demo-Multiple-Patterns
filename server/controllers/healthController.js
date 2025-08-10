import { ensureDbConnected } from '../services/dbService.js';

export async function testConnection(req, res) {
  try {
    await ensureDbConnected();
    res.json({ success: true, message: 'Database connected successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
