import { useEffect, useMemo, useState } from 'react';
import AppShell from './components/AppShell';
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from './lib/api';
import { navigate, usePathname } from './lib/router';
import DashboardPage from './pages/DashboardPage';
import DisciplinesPage from './pages/DisciplinesPage';
import ExamsPage from './pages/ExamsPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import QuestionsPage from './pages/QuestionsPage';
import RegisterPage from './pages/RegisterPage';
import TopicsPage from './pages/TopicsPage';
import VersionsPage from './pages/VersionsPage';

const protectedRoutes = [
  '/dashboard',
  '/disciplines',
  '/topics',
  '/questions',
  '/exams',
  '/versions',
];

const publicRoutes = ['/login', '/register'];

export default function App() {
  const pathname = usePathname();
  const [token, setToken] = useState(() => getStoredToken());

  const isAuthenticated = Boolean(token);

  const routeType = useMemo(() => {
    if (protectedRoutes.includes(pathname)) {
      return 'protected';
    }

    if (publicRoutes.includes(pathname)) {
      return 'public';
    }

    return 'not-found';
  }, [pathname]);

  useEffect(() => {
    if (!isAuthenticated && routeType === 'protected') {
      navigate('/login');
      return;
    }

    if (isAuthenticated && routeType === 'public') {
      navigate('/dashboard');
    }
  }, [isAuthenticated, routeType]);

  function handleAuthenticated(nextToken) {
    setStoredToken(nextToken);
    setToken(nextToken);
  }

  function handleLogout() {
    clearStoredToken();
    setToken('');
    navigate('/login');
  }

  function handleUnauthorized() {
    handleLogout();
  }

  if (!isAuthenticated) {
    if (pathname === '/register') {
      return <RegisterPage onAuthenticated={handleAuthenticated} />;
    }

    return <LoginPage onAuthenticated={handleAuthenticated} />;
  }

  let page = <NotFoundPage />;

  if (pathname === '/dashboard') {
    page = <DashboardPage token={token} onUnauthorized={handleUnauthorized} />;
  } else if (pathname === '/disciplines') {
    page = <DisciplinesPage token={token} onUnauthorized={handleUnauthorized} />;
  } else if (pathname === '/topics') {
    page = <TopicsPage token={token} onUnauthorized={handleUnauthorized} />;
  } else if (pathname === '/questions') {
    page = <QuestionsPage token={token} onUnauthorized={handleUnauthorized} />;
  } else if (pathname === '/exams') {
    page = <ExamsPage token={token} onUnauthorized={handleUnauthorized} />;
  } else if (pathname === '/versions') {
    page = <VersionsPage token={token} onUnauthorized={handleUnauthorized} />;
  }

  return (
    <AppShell currentPath={pathname} onLogout={handleLogout}>
      {page}
    </AppShell>
  );
}
