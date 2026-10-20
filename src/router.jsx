import { useSyncExternalStore } from 'react';

function subscribe(callback) {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
}

export function useRoute() {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

export function navigate(href) {
  window.history.pushState(null, '', href);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
}

export function Link({ href, children, ...props }) {
  const handleClick = (e) => {
    // Let the browser handle new-tab / new-window clicks
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(href);
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
