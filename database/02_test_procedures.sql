-- =====================================================================================
-- TEST SCRIPT FOR FAVORITES DEMO STORED PROCEDURES
-- =====================================================================================
-- Run this after creating the stored procedures to verify everything works
-- =====================================================================================

USE TestNet_001;
GO

PRINT '=====================================================================================';
PRINT 'TESTING FAVORITES DEMO STORED PROCEDURES';
PRINT '=====================================================================================';
PRINT '';

-- =====================================================================================
-- 1. TEST: Get All Resources (should return your 4 predefined resources)
-- =====================================================================================
PRINT '1. Testing sp_GetAllResources...';
EXEC FavoritesDemo.sp_GetAllResources @UserId = 1;
PRINT '';

-- =====================================================================================
-- 2. TEST: Get Frequently Visited (should return your 2 seeded items)
-- =====================================================================================
PRINT '2. Testing sp_GetFrequentlyVisited...';
EXEC FavoritesDemo.sp_GetFrequentlyVisited @UserId = 1, @TopCount = 5;
PRINT '';

-- =====================================================================================
-- 3. TEST: Get User Favorites (should be empty initially)
-- =====================================================================================
PRINT '3. Testing sp_GetUserFavorites (should be empty)...';
EXEC FavoritesDemo.sp_GetUserFavorites @UserId = 1;
PRINT '';

-- =====================================================================================
-- 4. TEST: Add a Favorite
-- =====================================================================================
PRINT '4. Testing sp_AddFavorite (adding github.com)...';
EXEC FavoritesDemo.sp_AddFavorite 
    @UserId = 1, 
    @Url = 'https://github.com', 
    @UserNotes = 'My favorite coding platform';
PRINT '';

-- =====================================================================================
-- 5. TEST: Check if URL is Favorited
-- =====================================================================================
PRINT '5. Testing sp_IsFavorite (github.com should be true)...';
EXEC FavoritesDemo.sp_IsFavorite @UserId = 1, @Url = 'https://github.com';
PRINT '';

-- =====================================================================================
-- 6. TEST: Get Favorites Count
-- =====================================================================================
PRINT '6. Testing sp_GetFavoritesCount (should be 1)...';
EXEC FavoritesDemo.sp_GetFavoritesCount @UserId = 1;
PRINT '';

-- =====================================================================================
-- 7. TEST: Get User Favorites Again (should show github.com)
-- =====================================================================================
PRINT '7. Testing sp_GetUserFavorites (should show github.com)...';
EXEC FavoritesDemo.sp_GetUserFavorites @UserId = 1;
PRINT '';

-- =====================================================================================
-- 8. TEST: Add Another Favorite
-- =====================================================================================
PRINT '8. Testing sp_AddFavorite (adding google.com)...';
EXEC FavoritesDemo.sp_AddFavorite 
    @UserId = 1, 
    @Url = 'https://google.com', 
    @DisplayName = 'Google Search',
    @UserNotes = 'Primary search engine';
PRINT '';

-- =====================================================================================
-- 9. TEST: Track a Visit
-- =====================================================================================
PRINT '9. Testing sp_TrackVisit (visiting github.com)...';
EXEC FavoritesDemo.sp_TrackVisit 
    @UserId = 1, 
    @Url = 'https://github.com', 
    @SessionTimeSeconds = 300;
PRINT '';

-- =====================================================================================
-- 10. TEST: Update Resource Title
-- =====================================================================================
PRINT '10. Testing sp_UpdateResourceTitle...';
EXEC FavoritesDemo.sp_UpdateResourceTitle 
    @Url = 'https://github.com', 
    @NewDisplayName = 'GitHub - Where the world builds software';
PRINT '';

-- =====================================================================================
-- 11. TEST: Try to Add Duplicate Favorite (should fail gracefully)
-- =====================================================================================
PRINT '11. Testing sp_AddFavorite with duplicate (should fail gracefully)...';
EXEC FavoritesDemo.sp_AddFavorite 
    @UserId = 1, 
    @Url = 'https://github.com';
PRINT '';

-- =====================================================================================
-- 12. TEST: Remove a Favorite
-- =====================================================================================
PRINT '12. Testing sp_RemoveFavorite (removing google.com)...';
EXEC FavoritesDemo.sp_RemoveFavorite @UserId = 1, @Url = 'https://google.com';
PRINT '';

-- =====================================================================================
-- 13. TEST: Get Final State
-- =====================================================================================
PRINT '13. Final state - User Favorites (should only show github.com)...';
EXEC FavoritesDemo.sp_GetUserFavorites @UserId = 1;
PRINT '';

PRINT '14. Final state - Favorites Count (should be 1)...';
EXEC FavoritesDemo.sp_GetFavoritesCount @UserId = 1;
PRINT '';

-- =====================================================================================
-- 15. TEST: Clear All Favorites
-- =====================================================================================
PRINT '15. Testing sp_ClearAllFavorites...';
EXEC FavoritesDemo.sp_ClearAllFavorites @UserId = 1;
PRINT '';

PRINT '16. After clear - Favorites Count (should be 0)...';
EXEC FavoritesDemo.sp_GetFavoritesCount @UserId = 1;
PRINT '';

PRINT '=====================================================================================';
PRINT 'TEST COMPLETE!';
PRINT 'If all tests passed, your stored procedures are ready for JavaScript integration.';
PRINT '=====================================================================================';
