// ObserverManager unit tests
// Purpose: Ensure subscribe/unsubscribe mechanics work and that one failing subscriber doesn't break others.
import { expect } from 'chai';
import { createObserverManager } from '../../src/observers/observer-manager.js';

describe('ObserverManager', () => {
  it('subscribes, notifies, and unsubscribes', () => {
    // Subscriptions should trigger an init notification when requested and update counts accurately
    const om = createObserverManager();
    let calls = 0;
    const cb = () => { calls += 1; };

    om.subscribe(cb, { init: true }); // initial notify
    expect(calls).to.equal(1);
    expect(om.getSubscriberCount()).to.equal(1);

    om.notifyAll({ state: 1 });
    expect(calls).to.equal(2);

    expect(om.unsubscribe(cb)).to.equal(true);
    expect(om.getSubscriberCount()).to.equal(0);
  });

  it('handles errors in subscribers without breaking others', () => {
    // One subscriber throws; others should still be invoked exactly once
    const om = createObserverManager();
    let okCalls = 0;
    const bad = () => { throw new Error('boom'); };
    const ok = () => { okCalls += 1; };

    om.subscribe(bad);
    om.subscribe(ok);

    om.notifyAll({});
    expect(okCalls).to.equal(1);
  });
});
