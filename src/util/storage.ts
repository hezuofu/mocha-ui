/** localStorage wrapper with error logging — mirrors the original try/catch pattern
 *  but logs failures so they are observable in production. */
const storage = {
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch (e) { console.warn('[storage] get failed:', key, e); return null; }
  },
  set(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch (e) { console.warn('[storage] set failed:', key, e); }
  },
  remove(key: string): void {
    try { localStorage.removeItem(key); } catch (e) { console.warn('[storage] remove failed:', key, e); }
  },
};
export default storage;
