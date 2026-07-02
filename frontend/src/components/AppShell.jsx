'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { LiveDataProvider } from '@/context/LiveDataContext';

const AUTH_PATHS = ['/signin', '/signup'];

export default function AppShell({ children }) {
  const pathname = usePathname() ?? '';
  const router   = useRouter();
  const isAuth   = AUTH_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

  // Guard: protected routes require authentication
  useEffect(() => {
    if (!isAuth) {
      const loggedIn = localStorage.getItem('ss_auth') === '1';
      if (!loggedIn) {
        router.replace('/signin');
      }
    }
  }, [isAuth, router]);

  const isDashboard = pathname === '/dashboard';

  if (isAuth) {
    return <>{children}</>;
  }

  return (
    <LiveDataProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0D1117' }}>
        <Sidebar />
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          marginLeft: '64px',
          overflow: 'hidden',
        }}>
          <Header />
          <main style={{
            flex: 1,
            display: isDashboard ? 'flex' : 'block',
            flexDirection: isDashboard ? 'column' : 'initial',
            overflowY: isDashboard ? 'hidden' : 'auto',
            background: '#0D1117',
            padding: '20px 24px',
          }}>
            {children}
          </main>
        </div>
      </div>
    </LiveDataProvider>
  );
}

