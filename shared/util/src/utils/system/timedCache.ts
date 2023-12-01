// From https://github.com/HQarroum/timed-cache
// Converted to typescript to allow for easy commonjs import

interface CacheEntry<T> {
  handle: NodeJS.Timeout;
  data: T;
  callback: (key: string | object, data: T) => void;
}

interface Options<T> {
  defaultTtl?: number;
  ttl?: number;
  callback?: (key: string | object, data: T) => void;
}

/**
 * ///////////////////////////////////////
 * //////////// Cache module /////////////
 * ///////////////////////////////////////
 *
 * This module offers object caching mechanisms for
 * third-party modules. It allows to manage the lifecycle
 * of cached objects by associating them with a time-to-live.
 */

/**
 * Shortcut function for checking if an object has
 * a given property directly on itself.
 */
const has = (obj: object | null, key: string): boolean => obj !== null && Object.prototype.hasOwnProperty.call(obj, key);

/**
 * A prefix used to forbid access to internal properties
 * of the object storage.
 */
const prefix = '__cache__';

/**
 * If the key is an object, we serialize it, so it
 * can be cached transparently.
 */
const serialize = function (key: string | object): string {
  if (typeof key !== 'string') {
    return (prefix + JSON.stringify(key));
  }
  return (prefix + key);
};

/**
 * The `timed-cache` implementation.
 */
class Cache<T> {
  private cache: { [key: string]: CacheEntry<T> };
  private defaultTtl: number;

  /**
   * Cache constructor.
   * @param {*} options the `options` object
   * holder used by the cache implementation.
   */
  constructor(options: Options<T> = { defaultTtl: 60 * 1000 }) {
    // The cache storage.
    this.cache = {};
    // The default cached objects expiration
    // delay is expressed in milliseconds and
    // is defined by an internal default value
    // or a user value if it is passed to the
    // constructor.
    this.defaultTtl = options.defaultTtl || 60 * 1000;
  }

  /**
   * Puts a key/value pair into the cache storage.
   */
  put(key: string | object, value: T, options?: Options<T>): void {
    const ttl  = (options ? options.ttl : undefined) || this.defaultTtl;
    const callback = (options ? options.callback : undefined) || function () {};
    const key_ = serialize(key);

    // Checking whether the given key already
    // has a value.
    const v = this.cache[key_];

    if (v) {
      // We clear the timeout associated with
      // the existing value.
      clearTimeout(v.handle);
    }

    // We then create a new timeout function for
    // the new value.
    const handle = setTimeout(() => this.remove(key), ttl);

    // And we save the value into the cache storage
    // with the handle.
    this.cache[key_] = { handle, data: value, callback };
  }

  /**
   * Returns a cached value associated with the
   * given key if it exists, returns an undefined
   * value otherwise.
   */
  get(key: string | object): T | undefined {
    const value = this.cache[serialize(key)];
    return value && value.data;
  }

  /**
   * Clears the cache entry associated
   * with the given `key`.
   */
  remove(key: string | object): void {
    const key_  = serialize(key);
    const value = this.cache[key_];

    if (value) {
      clearTimeout(value.handle);
      delete this.cache[key_];
      value.callback(key, value.data);
    }
  }

  /**
   * Clears the internal cache.
   */
  clear(): void {
    for (const entry in this.cache) {
      if (has(this.cache, entry)) {
        clearTimeout(this.cache[entry].handle);
      }
    }
    this.cache = {};
  }

  /**
   * Returns the size of the cache object in
   * terms of referenced elements.
   */
  size(): number {
    return Object.keys(this.cache).length;
  }
}

export default Cache;
