
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  
  // Close any open menus when route changes
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdowns = document.querySelectorAll('[data-dropdown]');
      dropdowns.forEach(dropdown => {
        if (!dropdown.contains(event.target as Node)) {
          // Close dropdown logic here
        }
      });
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Close menus on route change
  useEffect(() => {
    // Close menus logic
  }, [location.pathname]);
  
  // Check if current route is an auth page
  const isAuthPage = location.pathname.startsWith('/auth');
  
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-md mx-auto p-6">
          {children}
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="page-transition">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
