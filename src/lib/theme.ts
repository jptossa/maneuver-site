export const THEME_STORAGE_KEY = "maneuver-theme";

export type Theme = "light" | "dark";

/**
 * Runs in <head> before first paint: stored choice, else the OS preference.
 * Plain string (not a function) because it is inlined into the HTML; every
 * browser API access is guarded so private windows or blocked storage still work.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=null;try{t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}})();`;
