// Web-compatible storage implementation using localStorage
// This replaces react-native-mmkv for web builds

class WebStorage {
  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  getString(key: string): string | undefined {
    if (!this.isLocalStorageAvailable()) return undefined;
    const value = localStorage.getItem(key);
    return value === null ? undefined : value;
  }

  set(key: string, value: string): void {
    if (!this.isLocalStorageAvailable()) return;
    localStorage.setItem(key, value);
  }

  delete(key: string): void {
    if (!this.isLocalStorageAvailable()) return;
    localStorage.removeItem(key);
  }

  clearAll(): void {
    if (!this.isLocalStorageAvailable()) return;
    localStorage.clear();
  }
}

export const storage = new WebStorage();

/**
 * Loads a string from storage.
 *
 * @param key The key to fetch.
 */
export function loadString(key: string): string | null {
  try {
    return storage.getString(key) ?? null;
  } catch {
    return null;
  }
}

/**
 * Saves a string to storage.
 *
 * @param key The key to fetch.
 * @param value The value to store.
 */
export function saveString(key: string, value: string): boolean {
  try {
    storage.set(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads something from storage and runs it thru JSON.parse.
 *
 * @param key The key to fetch.
 */
export function load<T>(key: string): T | null {
  let almostThere: string | null = null;
  try {
    almostThere = loadString(key);
    return JSON.parse(almostThere ?? "") as T;
  } catch {
    return (almostThere as T) ?? null;
  }
}

/**
 * Saves an object to storage.
 *
 * @param key The key to fetch.
 * @param value The value to store.
 */
export function save(key: string, value: unknown): boolean {
  try {
    saveString(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes something from storage.
 *
 * @param key The key to kill.
 */
export function remove(key: string): void {
  try {
    storage.delete(key);
  } catch {}
}

/**
 * Burn it all to the ground.
 */
export function clear(): void {
  try {
    storage.clearAll();
  } catch {}
}
