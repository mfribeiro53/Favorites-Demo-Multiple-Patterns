-- =====================================================================================
-- FIX SEED URLS - ENSURE PROPER URL FORMATTING (SAFER VERSION)
-- =====================================================================================
-- This script updates the original seed data to have properly formatted URLs
-- with https:// protocol for consistency and proper functionality
-- =====================================================================================

USE TestNet_001;
GO

PRINT 'Fixing seed URLs to be properly formatted...';

-- Step 1: Update the original predefined resources to have proper URLs
PRINT 'Step 1: Updating predefined resource URLs...';

UPDATE FavoritesDemo.Resources 
SET Url = 'https://google.com'
WHERE Url = 'google.com' AND IsPredefined = 1;
PRINT 'Updated google.com to https://google.com';

UPDATE FavoritesDemo.Resources 
SET Url = 'https://youtube.com'
WHERE Url = 'youtube.com' AND IsPredefined = 1;
PRINT 'Updated youtube.com to https://youtube.com';

UPDATE FavoritesDemo.Resources 
SET Url = 'https://wikipedia.org'
WHERE Url = 'wikipedia.org' AND IsPredefined = 1;
PRINT 'Updated wikipedia.org to https://wikipedia.org';

UPDATE FavoritesDemo.Resources 
SET Url = 'https://github.com'
WHERE Url = 'github.com' AND IsPredefined = 1;
PRINT 'Updated github.com to https://github.com';

-- Step 2: Handle FrequentlyVisited references BEFORE deleting duplicates
PRINT 'Step 2: Updating FrequentlyVisited references...';

-- Show current FrequentlyVisited state
PRINT 'Current FrequentlyVisited entries:';
SELECT fv.FrequentlyVisitedId, r.ResourceId, r.Url, r.IsPredefined, fv.VisitCount
FROM FavoritesDemo.FrequentlyVisited fv
INNER JOIN FavoritesDemo.Resources r ON fv.ResourceId = r.ResourceId;

-- Step 3: Remove duplicate entries (non-predefined ones with full URLs)
PRINT 'Step 3: Removing duplicate resources...';

-- Check for duplicates before deletion
PRINT 'Duplicate GitHub entries to be removed:';
SELECT ResourceId, Url, IsPredefined 
FROM FavoritesDemo.Resources 
WHERE Url = 'https://github.com' AND IsPredefined = 0;

PRINT 'Duplicate Google entries to be removed:';
SELECT ResourceId, Url, IsPredefined 
FROM FavoritesDemo.Resources 
WHERE Url = 'https://google.com' AND IsPredefined = 0;

-- Delete duplicates
DELETE FROM FavoritesDemo.Resources 
WHERE Url = 'https://github.com' AND IsPredefined = 0;

DELETE FROM FavoritesDemo.Resources 
WHERE Url = 'https://google.com' AND IsPredefined = 0;

-- Step 4: Clean up any orphaned FrequentlyVisited entries
PRINT 'Step 4: Cleaning up orphaned FrequentlyVisited entries...';
DELETE fv
FROM FavoritesDemo.FrequentlyVisited fv
LEFT JOIN FavoritesDemo.Resources r ON fv.ResourceId = r.ResourceId
WHERE r.ResourceId IS NULL OR r.IsActive = 0;

PRINT 'URL formatting completed successfully!';

-- Show the updated resources
PRINT 'Updated resources:';
SELECT ResourceId, Url, DisplayName, IsPredefined, TotalVisits
FROM FavoritesDemo.Resources 
WHERE IsActive = 1
ORDER BY IsPredefined DESC, TotalVisits DESC;

PRINT '';
PRINT 'Updated frequently visited:';
SELECT r.Url, r.DisplayName, fv.VisitCount, fv.RecommendationScore
FROM FavoritesDemo.FrequentlyVisited fv
INNER JOIN FavoritesDemo.Resources r ON fv.ResourceId = r.ResourceId
WHERE r.IsActive = 1
ORDER BY fv.RecommendationScore DESC;
