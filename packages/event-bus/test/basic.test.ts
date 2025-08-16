import { strict as assert } from 'node:assert';
import test from 'node:test';
import { createEventBus } from '../src/index';

type E = {
  'count.tick': { n: number };
  'msg': { text: string };
};

test('typed event bus emits and receives payloads', async (t) => {
  const bus = createEventBus<E>();

  await t.test('on/emit', () => {
    let seen = 0;
    const off = bus.on('count.tick', (e) => {
      seen = e.detail.n;
    });

    bus.emit('count.tick', { n: 42 });
    off();

    assert.equal(seen, 42);
  });

  await t.test('once', () => {
    let hits = 0;
    bus.once('msg', () => { hits++; });
    bus.emit('msg', { text: 'a' });
    bus.emit('msg', { text: 'b' });
    assert.equal(hits, 1);
  });
});
