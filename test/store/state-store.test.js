// StateStore unit tests
// Purpose: Verify basic Set-like semantics, immutability of snapshots, and restore/clear behaviors.
import { expect } from 'chai';
import { createStateStore } from '../../src/store/state-store.js';

describe('StateStore', () => {
  it('add/remove/has/getCount', () => {
  // Basic CRUD and count checks
    const s = createStateStore();
    expect(s.getCount()).to.equal(0);
    expect(s.add('a')).to.equal(true);
    expect(s.add('a')).to.equal(false);
    expect(s.getCount()).to.equal(1);
    expect(s.has('a')).to.equal(true);
    expect(s.remove('a')).to.equal(true);
    expect(s.remove('a')).to.equal(false);
    expect(s.getCount()).to.equal(0);
  });

  it('getAll returns a copy and restore replaces state', () => {
    // getAll() should return a defensive copy; restore() replaces the internal Set
    const s = createStateStore();
    s.add('x');
    const snapshot = s.getAll();
    expect(snapshot).to.be.instanceOf(Set);
    snapshot.add('y'); // mutation should not affect store
    expect(s.getCount()).to.equal(1);

    const newSnap = new Set(['p', 'q']);
    s.restore(newSnap);
    expect(s.getAllAsArray().sort()).to.deep.equal(['p', 'q']);
  });

  it('clear returns previous state snapshot', () => {
    // clear() should return the previous Set for potential undo logic
    const s = createStateStore();
    s.add('a');
    s.add('b');
    const prev = s.clear();
    expect(prev).to.be.instanceOf(Set);
    expect(Array.from(prev).sort()).to.deep.equal(['a', 'b']);
    expect(s.getCount()).to.equal(0);
  });
});
