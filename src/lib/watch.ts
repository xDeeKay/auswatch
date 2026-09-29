const WATCH_MAX_SCREEN_PX = 260;

// A watch lays out at about 424 CSS px like a large phone, so viewport width
// cannot identify it; only the physical screen size (212px on a Galaxy Watch)
// is distinctive. Runs inline in <head> before first paint.
export const WATCH_INIT_SCRIPT = `(function(){try{if(screen.width<=${WATCH_MAX_SCREEN_PX}&&screen.height<=${WATCH_MAX_SCREEN_PX})document.documentElement.setAttribute("data-watch","")}catch(e){}})();`;
