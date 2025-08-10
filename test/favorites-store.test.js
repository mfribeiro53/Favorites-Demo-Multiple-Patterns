// Modular Favorites Store unit tests (core behaviors)
// Purpose: Validate the public API, state updates, notifications, immutability, duplicate handling, clear, and unsubscribe.
import { expect } from 'chai';
import { createFavoritesStore } from '../src/favorites-store-modular.js';

// Note: The store may attempt DB calls; tests are resilient and focus on local state semantics

describe('Modular Favorites Store', () => {
  it('creates a store with the expected API', () => {
    // Surface contracts: presence of key methods
    const store = createFavoritesStore();
    expect(store).to.be.an('object');
    expect(store.addFavorite).to.be.a('function');
    expect(store.removeFavorite).to.be.a('function');
    expect(store.isFavorite).to.be.a('function');
    expect(store.subscribe).to.be.a('function');
  });

  it('adds favorites and updates state', async () => {
    // Happy path add -> state reflects change
    const store = createFavoritesStore();
    const url = 'https://example.com';
    await store.addFavorite(url);
    expect(store.isFavorite(url)).to.equal(true);
    expect(store.getCount()).to.equal(1);
  });

  it('removes favorites and updates state', async () => {
    // Happy path remove -> state reflects change
    const store = createFavoritesStore();
    const url = 'https://example.com';
    await store.addFavorite(url);
    await store.removeFavorite(url);
    expect(store.isFavorite(url)).to.equal(false);
    expect(store.getCount()).to.equal(0);
  });

  it('notifies subscribers with immutable snapshots', async () => {
    // Subscribers should get initial notify and immutable snapshots on changes
    const store = createFavoritesStore();
    let notifications = 0;
    let lastState = null;

    store.subscribe((favorites) => {
      notifications += 1;
      lastState = favorites;
    });

    expect(notifications).to.equal(1);
    expect(lastState.size).to.equal(0);

    await store.addFavorite('https://test.com');
    expect(notifications).to.equal(2);
    expect(lastState.size).to.equal(1);

  // Try to mutate snapshot (should not affect real store)
    const sizeBefore = lastState.size;
    lastState.add('https://hacker.com');
    expect(store.getCount()).to.equal(sizeBefore);
    expect(store.isFavorite('https://hacker.com')).to.equal(false);
  });

  it('handles duplicates by maintaining unique set', async () => {
    // Duplicate adds are no-ops for state size
    const store = createFavoritesStore();
    const url = 'https://example.com';
    await store.addFavorite(url);
    await store.addFavorite(url);
    expect(store.getCount()).to.equal(1);
  });

  it('clears all favorites', async () => {
    // clearAll removes all items; test focuses on resulting local state
    const store = createFavoritesStore();
    await store.addFavorite('https://example1.com');
    await store.addFavorite('https://example2.com');
    await store.clearAll();
    expect(store.getCount()).to.equal(0);
    expect(store.getAllFavorites()).to.have.length(0);
  });

  it('supports unsubscribe', async () => {
    // After unsubscribe, further notifications should not invoke callback
    const store = createFavoritesStore();
    let calls = 0;
    const cb = () => { calls += 1; };
    store.subscribe(cb);
    await store.addFavorite('https://test.com');
    const afterAdd = calls;
    store.unsubscribe(cb);
    await store.addFavorite('https://test2.com');
    expect(calls).to.equal(afterAdd);
  });
});
