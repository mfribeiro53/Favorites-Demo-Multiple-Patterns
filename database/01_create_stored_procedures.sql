-- =====================================================================================
-- FAVORITES DEMO APPLICATION - COMPLETE CRUD STORED PROCEDURES
-- =====================================================================================
-- Schema: FavoritesDemo
-- Purpose: Provide database persistence for favorites application
-- Run this file in SQL Server Management Studio or Azure Data Studio
-- =====================================================================================

USE TestNet_001;
GO

-- =====================================================================================
-- 1. GET ALL RESOURCES (replaces allResources array)
-- =====================================================================================
CREATE OR ALTER PROCEDURE FavoritesDemo.sp_GetAllResources
    @UserId INT = 1  -- Default to demo user
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        r.ResourceId,
        r.Url,
        r.DisplayName AS name,  -- Alias to match your JS object structure
        r.Description,
        r.FaviconUrl,
        r.TotalVisits,
        r.LastVisitDate,
        r.IsPredefined,
        r.IsActive,
        -- Check if this resource is favorited by the user
        CASE 
            WHEN uf.UserFavoriteId IS NOT NULL AND uf.IsActive = 1 
            THEN CAST(1 AS BIT) 
            ELSE CAST(0 AS BIT) 
        END AS IsFavorited
    FROM FavoritesDemo.Resources r
    LEFT JOIN FavoritesDemo.UserFavorites uf ON r.ResourceId = uf.ResourceId 
        AND uf.UserId = @UserId 
        AND uf.IsActive = 1
    WHERE r.IsActive = 1
    ORDER BY 
        r.IsPredefined DESC,  -- Predefined resources first
        r.TotalVisits DESC,   -- Then by popularity
        r.DisplayName;        -- Then alphabetically
END;
GO

-- =====================================================================================
-- 2. GET FREQUENTLY VISITED RESOURCES (replaces frequentlyVisited array)
-- =====================================================================================
CREATE OR ALTER PROCEDURE FavoritesDemo.sp_GetFrequentlyVisited
    @UserId INT = 1,
    @TopCount INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT TOP (@TopCount)
        r.ResourceId,
        r.Url,
        r.DisplayName AS name,  -- Alias to match your JS object structure
        fv.VisitCount,
        fv.LastVisitDate,
        fv.RecommendationScore,
        fv.IsRecommended,
        -- Check if this resource is favorited by the user
        CASE 
            WHEN uf.UserFavoriteId IS NOT NULL AND uf.IsActive = 1 
            THEN CAST(1 AS BIT) 
            ELSE CAST(0 AS BIT) 
        END AS IsFavorited
    FROM FavoritesDemo.FrequentlyVisited fv
    INNER JOIN FavoritesDemo.Resources r ON fv.ResourceId = r.ResourceId
    LEFT JOIN FavoritesDemo.UserFavorites uf ON r.ResourceId = uf.ResourceId 
        AND uf.UserId = @UserId 
        AND uf.IsActive = 1
    WHERE fv.UserId = @UserId 
        AND r.IsActive = 1
    ORDER BY 
        fv.RecommendationScore DESC,
        fv.VisitCount DESC,
        fv.LastVisitDate DESC;
END;
GO

-- =====================================================================================
-- 3. GET USER FAVORITES (replaces favorites store state)
-- =====================================================================================
CREATE OR ALTER PROCEDURE FavoritesDemo.sp_GetUserFavorites
    @UserId INT = 1
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        uf.UserFavoriteId,
        r.ResourceId,
        r.Url,
        COALESCE(uf.UserDisplayName, r.DisplayName) AS name,  -- User override or default
        r.Description,
        r.FaviconUrl,
        uf.CreatedDate AS FavoritedDate,
        uf.LastAccessedDate,
        uf.AccessCount,
        uf.UserNotes,
        uf.SortOrder
    FROM FavoritesDemo.UserFavorites uf
    INNER JOIN FavoritesDemo.Resources r ON uf.ResourceId = r.ResourceId
    WHERE uf.UserId = @UserId 
        AND uf.IsActive = 1 
        AND r.IsActive = 1
    ORDER BY 
        COALESCE(uf.SortOrder, 999999),  -- Custom order first
        uf.CreatedDate DESC;             -- Then by date added
END;
GO

-- =====================================================================================
-- 4. ADD FAVORITE (replaces favoritesStore.addFavorite)
-- =====================================================================================
CREATE OR ALTER PROCEDURE FavoritesDemo.sp_AddFavorite
    @UserId INT = 1,
    @Url NVARCHAR(500),
    @DisplayName NVARCHAR(200) = NULL,  -- Optional override
    @UserNotes NVARCHAR(1000) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        
        DECLARE @ResourceId INT;
        DECLARE @Message NVARCHAR(255);
        
        -- Validate input
        IF LEN(TRIM(@Url)) = 0
        BEGIN
            RAISERROR('URL cannot be empty', 16, 1);
            RETURN;
        END
        
        -- Check if resource exists, if not create it
        SELECT @ResourceId = ResourceId 
        FROM FavoritesDemo.Resources 
        WHERE Url = @Url AND IsActive = 1;
        
        IF @ResourceId IS NULL
        BEGIN
            -- Create new resource
            INSERT INTO FavoritesDemo.Resources (Url, DisplayName, CreatedByUserId, IsPredefined)
            VALUES (@Url, COALESCE(@DisplayName, @Url), @UserId, 0);
            
            SET @ResourceId = SCOPE_IDENTITY();
        END
        
        -- Check if already favorited
        IF EXISTS (SELECT 1 FROM FavoritesDemo.UserFavorites 
                   WHERE UserId = @UserId AND ResourceId = @ResourceId AND IsActive = 1)
        BEGIN
            SET @Message = 'URL is already in favorites';
            SELECT @Message AS Message, CAST(0 AS BIT) AS Success;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        -- Add to favorites
        INSERT INTO FavoritesDemo.UserFavorites (UserId, ResourceId, UserDisplayName, UserNotes)
        VALUES (@UserId, @ResourceId, @DisplayName, @UserNotes);
        
        -- Update resource visit count
        UPDATE FavoritesDemo.Resources 
        SET TotalVisits = TotalVisits + 1, LastVisitDate = GETUTCDATE() 
        WHERE ResourceId = @ResourceId;
        
        SET @Message = 'Added "' + @Url + '" to favorites';
        SELECT @Message AS Message, CAST(1 AS BIT) AS Success, @ResourceId AS ResourceId;
        
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        SELECT @ErrorMessage AS Message, CAST(0 AS BIT) AS Success;
    END CATCH
END;
GO

-- =====================================================================================
-- 5. REMOVE FAVORITE (replaces favoritesStore.removeFavorite)
-- =====================================================================================
CREATE OR ALTER PROCEDURE FavoritesDemo.sp_RemoveFavorite
    @UserId INT = 1,
    @Url NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @ResourceId INT;
        DECLARE @Message NVARCHAR(255);
        
        -- Find the resource
        SELECT @ResourceId = ResourceId 
        FROM FavoritesDemo.Resources 
        WHERE Url = @Url AND IsActive = 1;
        
        IF @ResourceId IS NULL
        BEGIN
            SET @Message = 'URL not found';
            SELECT @Message AS Message, CAST(0 AS BIT) AS Success;
            RETURN;
        END
        
        -- Check if it's favorited
        IF NOT EXISTS (SELECT 1 FROM FavoritesDemo.UserFavorites 
                       WHERE UserId = @UserId AND ResourceId = @ResourceId AND IsActive = 1)
        BEGIN
            SET @Message = 'URL is not in favorites';
            SELECT @Message AS Message, CAST(0 AS BIT) AS Success;
            RETURN;
        END
        
        -- Soft delete the favorite
        UPDATE FavoritesDemo.UserFavorites 
        SET IsActive = 0 
        WHERE UserId = @UserId AND ResourceId = @ResourceId;
        
        SET @Message = 'Removed "' + @Url + '" from favorites';
        SELECT @Message AS Message, CAST(1 AS BIT) AS Success;
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        SELECT @ErrorMessage AS Message, CAST(0 AS BIT) AS Success;
    END CATCH
END;
GO

-- =====================================================================================
-- 6. CLEAR ALL FAVORITES (replaces favoritesStore.clearAll)
-- =====================================================================================
CREATE OR ALTER PROCEDURE FavoritesDemo.sp_ClearAllFavorites
    @UserId INT = 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @Count INT;
        DECLARE @Message NVARCHAR(255);
        
        -- Count current favorites
        SELECT @Count = COUNT(*) 
        FROM FavoritesDemo.UserFavorites 
        WHERE UserId = @UserId AND IsActive = 1;
        
        IF @Count = 0
        BEGIN
            SET @Message = 'No favorites to clear';
            SELECT @Message AS Message, CAST(0 AS BIT) AS Success, 0 AS ClearedCount;
            RETURN;
        END
        
        -- Soft delete all favorites
        UPDATE FavoritesDemo.UserFavorites 
        SET IsActive = 0 
        WHERE UserId = @UserId AND IsActive = 1;
        
        SET @Message = 'Cleared all favorites (' + CAST(@Count AS VARCHAR) + ' items)';
        SELECT @Message AS Message, CAST(1 AS BIT) AS Success, @Count AS ClearedCount;
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        SELECT @ErrorMessage AS Message, CAST(0 AS BIT) AS Success, 0 AS ClearedCount;
    END CATCH
END;
GO

-- =====================================================================================
-- 7. CHECK IF URL IS FAVORITED (replaces favoritesStore.isFavorite)
-- =====================================================================================
CREATE OR ALTER PROCEDURE FavoritesDemo.sp_IsFavorite
    @UserId INT = 1,
    @Url NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @IsFavorited BIT = 0;
    
    SELECT @IsFavorited = 1
    FROM FavoritesDemo.UserFavorites uf
    INNER JOIN FavoritesDemo.Resources r ON uf.ResourceId = r.ResourceId
    WHERE uf.UserId = @UserId 
        AND r.Url = @Url 
        AND uf.IsActive = 1 
        AND r.IsActive = 1;
    
    SELECT @IsFavorited AS IsFavorited, @Url AS Url;
END;
GO

-- =====================================================================================
-- 8. GET FAVORITES COUNT (replaces favoritesStore.getCount)
-- =====================================================================================
CREATE OR ALTER PROCEDURE FavoritesDemo.sp_GetFavoritesCount
    @UserId INT = 1
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT COUNT(*) AS FavoritesCount
    FROM FavoritesDemo.UserFavorites uf
    INNER JOIN FavoritesDemo.Resources r ON uf.ResourceId = r.ResourceId
    WHERE uf.UserId = @UserId 
        AND uf.IsActive = 1 
        AND r.IsActive = 1;
END;
GO

-- =====================================================================================
-- 9. UPDATE RESOURCE WITH FETCHED TITLE (for your fetchPageTitle function)
-- =====================================================================================
CREATE OR ALTER PROCEDURE FavoritesDemo.sp_UpdateResourceTitle
    @Url NVARCHAR(500),
    @NewDisplayName NVARCHAR(200)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @Message NVARCHAR(255);
        DECLARE @RowsAffected INT;
        
        UPDATE FavoritesDemo.Resources 
        SET DisplayName = @NewDisplayName,
            LastUpdatedDate = GETUTCDATE()
        WHERE Url = @Url AND IsActive = 1;
        
        SET @RowsAffected = @@ROWCOUNT;
        
        IF @RowsAffected > 0
        BEGIN
            SET @Message = 'Updated title for "' + @Url + '" to "' + @NewDisplayName + '"';
            SELECT @Message AS Message, CAST(1 AS BIT) AS Success;
        END
        ELSE
        BEGIN
            SET @Message = 'URL not found: ' + @Url;
            SELECT @Message AS Message, CAST(0 AS BIT) AS Success;
        END
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        SELECT @ErrorMessage AS Message, CAST(0 AS BIT) AS Success;
    END CATCH
END;
GO

-- =====================================================================================
-- 10. TRACK VISIT (for analytics)
-- =====================================================================================
CREATE OR ALTER PROCEDURE FavoritesDemo.sp_TrackVisit
    @UserId INT = 1,
    @Url NVARCHAR(500),
    @SessionTimeSeconds INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @ResourceId INT;
        
        -- Find the resource
        SELECT @ResourceId = ResourceId 
        FROM FavoritesDemo.Resources 
        WHERE Url = @Url AND IsActive = 1;
        
        IF @ResourceId IS NOT NULL
        BEGIN
            -- Update or insert into FrequentlyVisited
            IF EXISTS (SELECT 1 FROM FavoritesDemo.FrequentlyVisited 
                       WHERE UserId = @UserId AND ResourceId = @ResourceId)
            BEGIN
                -- Update existing record
                UPDATE FavoritesDemo.FrequentlyVisited 
                SET VisitCount = VisitCount + 1,
                    LastVisitDate = GETUTCDATE(),
                    AverageSessionTime = CASE 
                        WHEN @SessionTimeSeconds IS NOT NULL 
                        THEN (COALESCE(AverageSessionTime, 0) + @SessionTimeSeconds) / 2
                        ELSE AverageSessionTime 
                    END,
                    LastUpdatedDate = GETUTCDATE()
                WHERE UserId = @UserId AND ResourceId = @ResourceId;
            END
            ELSE
            BEGIN
                -- Insert new record
                INSERT INTO FavoritesDemo.FrequentlyVisited 
                (UserId, ResourceId, VisitCount, AverageSessionTime)
                VALUES (@UserId, @ResourceId, 1, @SessionTimeSeconds);
            END
            
            -- Update resource total visits
            UPDATE FavoritesDemo.Resources 
            SET TotalVisits = TotalVisits + 1, 
                LastVisitDate = GETUTCDATE()
            WHERE ResourceId = @ResourceId;
            
            SELECT 'Visit tracked successfully' AS Message, CAST(1 AS BIT) AS Success;
        END
        ELSE
        BEGIN
            SELECT 'Resource not found' AS Message, CAST(0 AS BIT) AS Success;
        END
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        SELECT @ErrorMessage AS Message, CAST(0 AS BIT) AS Success;
    END CATCH
END;
GO

PRINT 'All stored procedures created successfully!';
PRINT 'You can now test them with:';
PRINT '  EXEC FavoritesDemo.sp_GetAllResources;';
PRINT '  EXEC FavoritesDemo.sp_GetFrequentlyVisited;';
PRINT '  EXEC FavoritesDemo.sp_GetUserFavorites;';
