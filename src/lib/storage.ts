export const storage = {
  get(key: string) { return localStorage.getItem(key); },
  set(key: string, val: string) { localStorage.setItem(key, val); },
  del(key: string) { localStorage.removeItem(key); }
}
