import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { User, Notification } from '../types';
import { mockUser, mockNotifications } from '../data/mockData';

type AppView = 'marketing' | 'login' | 'signup' | 'dashboard' | 'admin' | 'online-store' | 'pos' | 'payments' | 'ai-assistant' | 'startups' | 'enterprises' | 'd2c' | 'b2b' | 'pricing' | 'resources' | 'capital' | 'shipping' | 'markets' | 'shop-pay' | 'small-business' | 'marketplaces' | 'retail' | 'international' | 'docs' | 'blog' | 'help-center' | 'partners' | 'app-store' | 'changelog' | 'status-page' | 'community' | 'privacy' | 'terms' | 'cookies' | 'sitemap' | 'about' | 'careers' | 'press' | 'investors' | 'contact';

interface AppContextType {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithOAuth: (provider: 'google' | 'github') => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  
  // Navigation
  currentView: AppView;
  dashboardSection: string;
  navigate: (view: AppView, section?: string) => void;
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  
  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  notificationPanelOpen: boolean;
  setNotificationPanelOpen: (open: boolean) => void;
  
  // Loading
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('marketing');
  const [dashboardSection, setDashboardSection] = useState('overview');
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = !!user;
  const unreadCount = notifications.filter(n => !n.read).length;

  const login = useCallback(async (email: string, _password: string): Promise<boolean> => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1200));
    if (email) {
      setUser({ ...mockUser, email });
      setCurrentView('dashboard');
      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
    return false;
  }, []);

  const loginWithOAuth = useCallback(async (provider: 'google' | 'github'): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setUser({ ...mockUser, name: provider === 'google' ? 'Alex from Google' : 'Dev from GitHub' });
    setCurrentView('dashboard');
    setIsLoading(false);
    return true;
  }, []);

  const signup = useCallback(async (name: string, email: string, _password: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1400));
    setUser({ ...mockUser, name, email, plan: 'starter' });
    setCurrentView('dashboard');
    setIsLoading(false);
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setCurrentView('marketing');
    setDashboardSection('overview');
  }, []);

  const navigate = useCallback((view: AppView, section?: string) => {
    setCurrentView(view);
    if (section) setDashboardSection(section);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  return (
    <AppContext.Provider value={{
      user,
      isAuthenticated,
      login,
      loginWithOAuth,
      signup,
      logout,
      currentView,
      dashboardSection,
      navigate,
      notifications,
      unreadCount,
      markNotificationRead,
      markAllRead,
      sidebarOpen,
      setSidebarOpen,
      mobileMenuOpen,
      setMobileMenuOpen,
      notificationPanelOpen,
      setNotificationPanelOpen,
      isLoading,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
