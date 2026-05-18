'use client';
import * as React from 'react';
import { Sidebar } from './Sidebar';
import { theme as T } from '@/lib/theme';

interface Props {
  children: React.ReactNode;
  userName?: string;
  userRole?: string;
}

export function AppShell({ children, userName, userRole }: Props) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Expose opener for TopBar hamburger
  React.useEffect(() => {
    (window as any).__drBloomOpenDrawer = () => setDrawerOpen(true);
    return () => { delete (window as any).__drBloomOpenDrawer; };
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: T.bg, color: T.ink900 }}>
      <Sidebar
        isMobile={isMobile}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        userName={userName}
        userRole={userRole}
      />
      <main style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {children}
      </main>
    </div>
  );
}
