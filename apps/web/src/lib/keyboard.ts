/**
 * The on-screen keyboard on a phone. Android (Chrome, Firefox) shrinks the layout viewport with it
 * (index.html: interactive-widget=resizes-content), so dvh and fixed boxes follow by themselves.
 * iOS Safari shrinks only the visual viewport and lays the keyboard over the page; for it this
 * listener sets, while the keyboard is up:
 *   data-kb on <html>  the bottom bar steps aside, the docked guess box sits on the keyboard;
 *   --kb               how much of the layout viewport the keyboard covers (0 on Android);
 *   --app-h            the height left to see (level screens size to it instead of 100dvh);
 *   --vv-top           how far iOS panned the page up (the countdown pill stays in sight).
 * "Up" = the visible height is over 150 px below the tallest seen at this width (an address bar
 * that hides or shows moves it about 60 px).
 */
export function watchKeyboard() {
  const vv = window.visualViewport;
  if (!vv) return;
  const root = document.documentElement;
  let width = 0;
  let tallest = 0;
  let last = '';
  const update = () => {
    // ponytail: pinch zoom is scaled out of the test, not out of --kb; nobody types zoomed in.
    const h = vv.height * vv.scale;
    if (window.innerWidth !== width) {
      width = window.innerWidth;
      tallest = h;
    }
    tallest = Math.max(tallest, h);
    const up = tallest - h > 150;
    const kb = up ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0;
    const top = Math.round(vv.offsetTop);
    const next = up ? `${kb}/${Math.round(vv.height)}/${top}` : '';
    if (next === last) return;
    last = next;
    if (up) {
      root.dataset.kb = '';
      root.style.setProperty('--kb', `${kb}px`);
      root.style.setProperty('--app-h', `${Math.round(vv.height)}px`);
      root.style.setProperty('--vv-top', `${top}px`);
    } else {
      delete root.dataset.kb;
      root.style.removeProperty('--kb');
      root.style.removeProperty('--app-h');
      root.style.removeProperty('--vv-top');
    }
  };
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  update();
}
