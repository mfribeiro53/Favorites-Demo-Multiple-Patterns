import sql from 'mssql';

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

let pool;

export async function initializeDatabase() {
  if (pool) return true;
  try {
    pool = await sql.connect(dbConfig);
    console.log('✅ Connected to SQL Server database');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

export async function ensureDbConnected() {
  if (!pool) {
    const connected = await initializeDatabase();
    if (!connected) throw new Error('Database not connected');
  }
}

export async function executeStoredProcedure(procedureName, parameters = {}) {
  await ensureDbConnected();
  try {
    const request = pool.request();

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

export async function closeDatabase() {
  if (pool) {
    await pool.close();
    pool = undefined;
  }
}
