import { useEffect, useState } from 'react';

function normalizePath(path) {
  if (!path) return '/';
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

export function getCurrentPath() {
  return normalizePath(window.location.pathname);
}

export function navigate(path) {
  const nextPath = normalizePath(path);
  if (nextPath === getCurrentPath()) {
    return;
  }

  window.history.pushState({}, '', nextPath);
  window.dispatchEvent(new Event('app:navigation'));
}

export function usePathname() {
  const [pathname, setPathname] = useState(getCurrentPath());

  useEffect(() => {
    const onLocationChange = () => {
      setPathname(getCurrentPath());
    };

    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('app:navigation', onLocationChange);

    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('app:navigation', onLocationChange);
    };
  }, []);

  return pathname;
}
