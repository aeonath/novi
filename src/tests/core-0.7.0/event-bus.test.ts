/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

import { EventBus } from '../../renderer/core/event-bus';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('should call listener when event is emitted', () => {
    const listener = jest.fn();
    bus.on('test', listener);
    bus.emit('test', 'hello');
    expect(listener).toHaveBeenCalledWith('hello');
  });

  it('should support multiple listeners on the same event', () => {
    const a = jest.fn();
    const b = jest.fn();
    bus.on('test', a);
    bus.on('test', b);
    bus.emit('test', 42);
    expect(a).toHaveBeenCalledWith(42);
    expect(b).toHaveBeenCalledWith(42);
  });

  it('should not call listeners for different events', () => {
    const listener = jest.fn();
    bus.on('a', listener);
    bus.emit('b', 'data');
    expect(listener).not.toHaveBeenCalled();
  });

  it('should unsubscribe via returned function', () => {
    const listener = jest.fn();
    const off = bus.on('test', listener);
    off();
    bus.emit('test', 'data');
    expect(listener).not.toHaveBeenCalled();
  });

  it('should handle once — listener fires only once', () => {
    const listener = jest.fn();
    bus.once('test', listener);
    bus.emit('test', 'first');
    bus.emit('test', 'second');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('first');
  });

  it('should unsubscribe once listener before it fires', () => {
    const listener = jest.fn();
    const off = bus.once('test', listener);
    off();
    bus.emit('test', 'data');
    expect(listener).not.toHaveBeenCalled();
  });

  it('should remove all listeners for an event with off()', () => {
    const a = jest.fn();
    const b = jest.fn();
    bus.on('test', a);
    bus.on('test', b);
    bus.off('test');
    bus.emit('test', 'data');
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it('should remove all listeners with clear()', () => {
    const a = jest.fn();
    const b = jest.fn();
    bus.on('x', a);
    bus.on('y', b);
    bus.clear();
    bus.emit('x', 'data');
    bus.emit('y', 'data');
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it('should not throw when emitting with no listeners', () => {
    expect(() => bus.emit('nonexistent', 'data')).not.toThrow();
  });

  it('should handle typed data', () => {
    const listener = jest.fn<void, [{ id: number; name: string }]>();
    bus.on<{ id: number; name: string }>('user', listener);
    bus.emit('user', { id: 1, name: 'test' });
    expect(listener).toHaveBeenCalledWith({ id: 1, name: 'test' });
  });
});
