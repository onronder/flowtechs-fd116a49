
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Database,
  Table,
  Share,
  Send,
  Briefcase,
  HardDrive,
  Brain,
  HelpCircle,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

type NavItem = {
  title: string;
  path: string;
  icon: React.ElementType;
};

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { title: 'Sources', path: '/sources', icon: Database },
  { title: 'Datasets', path: '/datasets', icon: Table },
  { title: 'Transformations', path: '/transformations', icon: Share },
  { title: 'Destinations', path: '/destinations', icon: Send },
  { title: 'Jobs', path: '/jobs', icon: Briefcase },
];

const secondaryNavItems: NavItem[] = [
  { title: 'Data Storage', path: '/data-storage', icon: HardDrive },
  { title: 'AI Insights', path: '/ai-insights', icon: Brain },
];

const utilityNavItems: NavItem[] = [
  { title: 'Help', path: '/help', icon: HelpCircle },
  { title: 'Settings', path: '/settings', icon: Settings },
  { title: 'Log Out', path: '/auth/signin', icon: LogOut },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const NavItem = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    return (
      <li>
        <Link 
          to={item.path} 
          className={cn(
            "nav-item group",
            isActive && "nav-item-active"
          )}
          title={collapsed ? item.title : undefined}
        >
          <Icon 
            size={20} 
            className={cn(
              "transition-transform duration-300", 
              isActive ? "text-primary" : "",
              !collapsed && "group-hover:translate-x-0.5"
            )} 
          />
          {!collapsed && (
            <span className="transition-opacity duration-300">{item.title}</span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <aside 
      className={cn(
        "sidebar-gradient h-screen flex flex-col border-r border-sidebar-border transition-all duration-300 ease-out-expo",
        collapsed ? "w-[70px]" : "w-[240px]"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border h-16">
        <div className={cn("flex items-center", collapsed && "justify-center w-full")}>
          {!collapsed && (
            <span className="text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              FlowTechs
            </span>
          )}
          {collapsed && (
            <span className="text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              F
            </span>
          )}
        </div>
        <button 
          onClick={toggleSidebar}
          className="p-1 text-sidebar-muted hover:text-sidebar-foreground rounded-md hover:bg-sidebar-foreground/5 transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <nav>
          <ul className="space-y-0.5">
            {mainNavItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </ul>
          
          <div className="nav-divider" />
          
          <ul className="space-y-0.5">
            {secondaryNavItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </ul>
          
          <div className="nav-divider" />
          
          <ul className="space-y-0.5">
            {utilityNavItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
