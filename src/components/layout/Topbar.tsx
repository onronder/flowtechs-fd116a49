
import { useState } from 'react';
import { 
  Bell, 
  User, 
  Search, 
  ChevronDown,
  Settings,
  LogOut,
  HelpCircle,
  Moon,
  Sun
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

type NotificationType = {
  id: number;
  title: string;
  time: string;
};

const mockNotifications: NotificationType[] = [
  { id: 1, title: 'New data source connected', time: '5m ago' },
  { id: 2, title: 'Dataset processing complete', time: '1h ago' },
  { id: 3, title: 'Transformation job failed', time: '3h ago' }
];

export function Topbar() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    setTheme(newTheme);
    
    toast({
      title: `${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} mode activated`,
      duration: 2000,
    });
  };
  
  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out",
        description: "You have been logged out successfully."
      });
      setUserMenuOpen(false);
      navigate("/auth/signin");
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="h-16 px-6 border-b border-border flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="relative w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full py-2 pl-10 pr-4 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/20 transition-colors"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button 
          onClick={toggleTheme}
          className="relative p-2 rounded-md hover:bg-muted transition-colors"
        >
          {theme === 'light' ? (
            <Moon size={20} className="text-muted-foreground" />
          ) : (
            <Sun size={20} className="text-muted-foreground" />
          )}
        </button>
        
        <div className="relative">
          <button 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-md hover:bg-muted transition-colors"
          >
            <Bell size={20} className="text-muted-foreground" />
            <span className="notification-dot"></span>
          </button>
          
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-card border border-border shadow-lg rounded-md p-2 z-50 animate-scale-in">
              <div className="border-b border-border pb-2 mb-2">
                <h3 className="font-medium">Notifications</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {mockNotifications.map((notification) => (
                  <div key={notification.id} className="p-2 hover:bg-muted rounded-md transition-colors mb-1 cursor-pointer">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">{notification.time}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-2 mt-2">
                <button className="text-sm text-primary hover:underline w-full text-center">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-muted transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User size={16} className="text-primary" />
            </div>
            <span className="text-sm font-medium">{user?.email || "User"}</span>
            <ChevronDown size={16} />
          </button>
          
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-card border border-border shadow-lg rounded-md py-1 z-50 animate-scale-in">
              <div className="px-4 py-2 border-b border-border">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-muted-foreground">{user?.id}</p>
              </div>
              <div className="py-1">
                <button className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted transition-colors text-left">
                  <Settings size={16} className="text-muted-foreground" />
                  <span>Settings</span>
                </button>
                <button className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted transition-colors text-left">
                  <HelpCircle size={16} className="text-muted-foreground" />
                  <span>Help</span>
                </button>
                <div className="border-t border-border my-1"></div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted transition-colors text-left"
                >
                  <LogOut size={16} className="text-danger" />
                  <span className="text-danger">Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
