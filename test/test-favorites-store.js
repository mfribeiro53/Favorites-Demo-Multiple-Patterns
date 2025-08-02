/**
 * Test suite for Modular Favorites Store
 * Basic tests to validate the store functionality
 */

// For Node.js testing, we'll use the CommonJS exports from the modular store
const { createFavoritesStore } = require('../src/favorites-store-modular.js');

function runTests() {
    console.log('🧪 Running Modular Favorites Store Tests...\n');
    
    let testCount = 0;
    let passedTests = 0;
    
    function test(description, testFn) {
        testCount++;
        try {
            testFn();
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
    test('Store creation', () => {
        const store = createFavoritesStore();
        assert(typeof store === 'object', 'Store should be an object');
        assert(typeof store.addFavorite === 'function', 'Should have addFavorite method');
        assert(typeof store.removeFavorite === 'function', 'Should have removeFavorite method');
        assert(typeof store.isFavorite === 'function', 'Should have isFavorite method');
        assert(typeof store.subscribe === 'function', 'Should have subscribe method');
    });
    
    // Test 2: Adding favorites
    test('Adding favorites', () => {
        const store = createFavoritesStore();
        const testUrl = 'https://example.com';
        
        store.addFavorite(testUrl);
        assert(store.isFavorite(testUrl), 'URL should be marked as favorite');
        assert(store.getCount() === 1, 'Count should be 1');
    });
    
    // Test 3: Removing favorites
    test('Removing favorites', () => {
        const store = createFavoritesStore();
        const testUrl = 'https://example.com';
        
        store.addFavorite(testUrl);
        store.removeFavorite(testUrl);
        assert(!store.isFavorite(testUrl), 'URL should not be marked as favorite');
        assert(store.getCount() === 0, 'Count should be 0');
    });
    
    // Test 4: Observer pattern
    test('Observer notifications', () => {
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
        store.addFavorite('https://test.com');
        assert(notificationCount === 2, 'Should get notification after adding');
        assert(lastNotifiedState.size === 1, 'State should have 1 item');
    });
    
    // Test 5: State immutability
    test('State immutability', () => {
        const store = createFavoritesStore();
        let capturedState = null;
        
        store.subscribe((favorites) => {
            capturedState = favorites;
        });
        
        store.addFavorite('https://test.com');
        const originalSize = capturedState.size;
        
        // Try to modify the captured state
        capturedState.add('https://hacker.com');
        
        // Check that the store's internal state wasn't affected
        assert(store.getCount() === originalSize, 'Internal state should not be modified');
        assert(!store.isFavorite('https://hacker.com'), 'Hacker URL should not be in store');
    });
    
    // Test 6: Duplicate handling
    test('Duplicate handling', () => {
        const store = createFavoritesStore();
        const testUrl = 'https://example.com';
        
        store.addFavorite(testUrl);
        store.addFavorite(testUrl); // Add same URL again
        
        assert(store.getCount() === 1, 'Should only have 1 item (no duplicates)');
    });
    
    // Test 7: Clear all
    test('Clear all favorites', () => {
        const store = createFavoritesStore();
        
        store.addFavorite('https://example1.com');
        store.addFavorite('https://example2.com');
        store.clearAll();
        
        assert(store.getCount() === 0, 'Count should be 0 after clearing');
        assert(store.getAllFavorites().length === 0, 'Should have no favorites');
    });
    
    // Test 8: Unsubscribe
    test('Unsubscribe functionality', () => {
        const store = createFavoritesStore();
        let callCount = 0;
        
        const callback = () => { callCount++; };
        store.subscribe(callback);
        
        store.addFavorite('https://test.com'); // Should trigger callback
        const countAfterAdd = callCount;
        
        store.unsubscribe(callback);
        store.addFavorite('https://test2.com'); // Should not trigger callback
        
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

runTests();
