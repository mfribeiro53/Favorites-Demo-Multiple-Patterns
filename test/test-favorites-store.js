/**
 * Test suite for Modular Favorites Store
 * Basic tests to validate the store functionality
 */

// ES6 import for the modular store
import { createFavoritesStore } from '../src/favorites-store-modular.js';

async function runTests() {
    console.log('🧪 Running Modular Favorites Store Tests...\n');
    
    let testCount = 0;
    let passedTests = 0;
    
    async function test(description, testFn) {
        testCount++;
        try {
            await testFn();
            console.log(`✅ Test ${testCount}: ${description}`);
            passedTests++;
        } catch (error) {
            console.log(`❌ Test ${testCount}: ${description}`);
            console.log(`   Error: ${error.message}`);
        }
    }
    
    function assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }
    
    // Test 1: Basic store creation
    await test('Store creation', async () => {
        const store = createFavoritesStore();
        assert(typeof store === 'object', 'Store should be an object');
        assert(typeof store.addFavorite === 'function', 'Should have addFavorite method');
        assert(typeof store.removeFavorite === 'function', 'Should have removeFavorite method');
        assert(typeof store.isFavorite === 'function', 'Should have isFavorite method');
        assert(typeof store.subscribe === 'function', 'Should have subscribe method');
    });
    
    // Test 2: Adding favorites
    await test('Adding favorites', async () => {
        const store = createFavoritesStore();
        const testUrl = 'https://example.com';
        
        await store.addFavorite(testUrl);
        assert(store.isFavorite(testUrl), 'URL should be marked as favorite');
        assert(store.getCount() === 1, 'Count should be 1');
    });
    
    // Test 3: Removing favorites
    await test('Removing favorites', async () => {
        const store = createFavoritesStore();
        const testUrl = 'https://example.com';
        
        await store.addFavorite(testUrl);
        await store.removeFavorite(testUrl);
        assert(!store.isFavorite(testUrl), 'URL should not be marked as favorite');
        assert(store.getCount() === 0, 'Count should be 0');
    });
    
    // Test 4: Observer pattern
    await test('Observer notifications', async () => {
        const store = createFavoritesStore();
        let notificationCount = 0;
        let lastNotifiedState = null;
        
        store.subscribe((favorites) => {
            notificationCount++;
            lastNotifiedState = favorites;
        });
        
        // Initial notification
        assert(notificationCount === 1, 'Should get initial notification');
        assert(lastNotifiedState.size === 0, 'Initial state should be empty');
        
        // Add favorite
        await store.addFavorite('https://test.com');
        assert(notificationCount === 2, 'Should get notification after adding');
        assert(lastNotifiedState.size === 1, 'State should have 1 item');
    });
    
    // Test 5: State immutability
    await test('State immutability', async () => {
        const store = createFavoritesStore();
        let capturedState = null;
        
        store.subscribe((favorites) => {
            capturedState = favorites;
        });
        
        await store.addFavorite('https://test.com');
        const originalSize = capturedState.size;
        
        // Try to modify the captured state
        capturedState.add('https://hacker.com');
        
        // Check that the store's internal state wasn't affected
        assert(store.getCount() === originalSize, 'Internal state should not be modified');
        assert(!store.isFavorite('https://hacker.com'), 'Hacker URL should not be in store');
    });
    
    // Test 6: Duplicate handling
    await test('Duplicate handling', async () => {
        const store = createFavoritesStore();
        const testUrl = 'https://example.com';
        
        await store.addFavorite(testUrl);
        await store.addFavorite(testUrl); // Add same URL again
        
        assert(store.getCount() === 1, 'Should only have 1 item (no duplicates)');
    });
    
    // Test 7: Clear all
    await test('Clear all favorites', async () => {
        const store = createFavoritesStore();
        
        await store.addFavorite('https://example1.com');
        await store.addFavorite('https://example2.com');
        await store.clearAll();
        
        assert(store.getCount() === 0, 'Count should be 0 after clearing');
        assert(store.getAllFavorites().length === 0, 'Should have no favorites');
    });
    
    // Test 8: Unsubscribe
    await test('Unsubscribe functionality', async () => {
        const store = createFavoritesStore();
        let callCount = 0;
        
        const callback = () => { callCount++; };
        store.subscribe(callback);
        
        await store.addFavorite('https://test.com'); // Should trigger callback
        const countAfterAdd = callCount;
        
        store.unsubscribe(callback);
        await store.addFavorite('https://test2.com'); // Should not trigger callback
        
        assert(callCount === countAfterAdd, 'Callback should not be called after unsubscribe');
    });
    
    console.log(`\n📊 Test Results: ${passedTests}/${testCount} tests passed`);
    
    if (passedTests === testCount) {
        console.log('🎉 All tests passed!');
    } else {
        console.log('❌ Some tests failed');
        process.exit(1);
    }
}

await runTests();
