import { expect } from 'chai';
import { createCommandManager } from '../../src/commands/command-manager.js';

function makeAction(counter, delta = 1) {
  return {
    type: 'COUNTER_DELTA',
    description: `change by ${delta}`,
    async execute() {
      counter.value += delta;
      return true;
    },
    async undo() {
      counter.value -= delta;
      return true;
    },
    getMetadata() {
      return { type: 'COUNTER_DELTA', delta };
    }
  };
}

describe('CommandManager', () => {
  it('executes, undoes, and redoes actions', async () => {
    const mgr = createCommandManager();
    const counter = { value: 0 };

    expect(mgr.canUndo()).to.equal(false);
    expect(mgr.canRedo()).to.equal(false);

    await mgr.executeAction(makeAction(counter, 2));
    expect(counter.value).to.equal(2);
    expect(mgr.canUndo()).to.equal(true);

    await mgr.undo();
    expect(counter.value).to.equal(0);
    expect(mgr.canRedo()).to.equal(true);

    await mgr.redo();
    expect(counter.value).to.equal(2);
  });

  it('clears redo history when a new action is executed after undo', async () => {
    const mgr = createCommandManager();
    const c = { value: 0 };

    await mgr.executeAction(makeAction(c, 1)); // 1
    await mgr.executeAction(makeAction(c, 1)); // 2
    expect(c.value).to.equal(2);

    await mgr.undo(); // -> 1
    expect(c.value).to.equal(1);
    expect(mgr.canRedo()).to.equal(true);

    // New branch
    await mgr.executeAction(makeAction(c, 5)); // -> 6
    expect(c.value).to.equal(6);
    // Redo path should be cleared now
    expect(mgr.canRedo()).to.equal(false);
  });

  it('getHistory and clearHistory behave correctly', async () => {
    const mgr = createCommandManager();
    const c = { value: 0 };

    await mgr.executeAction(makeAction(c, 3));
    await mgr.executeAction(makeAction(c, 4));

    const h1 = mgr.getHistory();
    expect(h1.totalActions).to.equal(2);
    expect(h1.actions[h1.currentIndex].isCurrentPosition).to.equal(true);

    mgr.clearHistory();
    const h2 = mgr.getHistory();
    expect(h2.totalActions).to.equal(0);
    expect(mgr.canUndo()).to.equal(false);
  });

  it('does not advance history if execute throws', async () => {
    const mgr = createCommandManager();
    const bad = {
      type: 'BAD',
      async execute() { throw new Error('boom'); },
      async undo() { /* no-op */ }
    };
    let threw = false;
    try {
      await mgr.executeAction(bad);
    } catch { threw = true; }
    expect(threw).to.equal(true);
    const h = mgr.getHistory();
    expect(h.totalActions).to.equal(0);
    expect(mgr.canUndo()).to.equal(false);
  });
});
