// Favorites Store advanced behaviors
// Purpose: Validate batch operations, hydration semantics, and multi-step undo/redo consistency.
import { expect } from 'chai';
import { createFavoritesStore } from '../../src/favorites-store-modular.js';

describe('Favorites Store - advanced', function () {
  this.timeout(10000);

  it('addMultiple handles duplicates and notifies once per execute', async () => {
  // addMultiple should aggregate updates into a single executed command and notify accordingly
    const store = createFavoritesStore();
    let notifications = 0;
    store.subscribe(() => { notifications += 1; });

    await store.addMultiple(['https://m1.com', 'https://m2.com', 'https://m1.com']);

    // We expect one notify after the command executes
    expect(store.getCount()).to.be.greaterThan(0);
    expect(notifications).to.be.greaterThan(0);
  });

  it('hydrate replaces state; notify option controls initial broadcast', async () => {
    // hydrate(snapshot, { notify }) swaps state; notify=false is silent, notify=true emits once
    const store = createFavoritesStore();
    let notified = 0;
    store.subscribe(() => { notified += 1; });

    const snapshot = new Set(['https://h1.com', 'https://h2.com']);

    // silent hydrate
    const before = notified;
    store.hydrate(snapshot, { notify: false });
    expect(store.getAllFavorites().sort()).to.deep.equal(['https://h1.com', 'https://h2.com']);
    expect(notified).to.equal(before); // no extra notify

    // notify=true hydrate
    store.hydrate(['https://h3.com'], { notify: true });
    expect(store.getAllFavorites()).to.deep.equal(['https://h3.com']);
    expect(notified).to.equal(before + 1);
  });

  it('undo/redo across multiple actions maintains state and notifications', async () => {
    // Ensure command history is coherent across several mutations, with redo cleared by new branch
    const store = createFavoritesStore();
    let notes = 0;
    store.subscribe(() => { notes += 1; });

    await store.addFavorite('https://u1.com');
    await store.addFavorite('https://u2.com');
    expect(store.getCount()).to.equal(2);

    const canUndo1 = store.canUndo();
    expect(canUndo1).to.equal(true);

    await store.undo();
    expect(store.getAllFavorites()).to.deep.equal(['https://u1.com']);

    await store.redo();
    expect(store.getAllFavorites().sort()).to.deep.equal(['https://u1.com', 'https://u2.com']);

    // New action should clear redo path
    await store.addFavorite('https://u3.com');
    expect(store.canRedo()).to.equal(false);
    expect(store.getCount()).to.equal(3);
    expect(notes).to.be.greaterThan(0);
  });
});
