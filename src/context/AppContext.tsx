import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  User, Notification, Product, Order, Customer,
  StoreSettings, ActivityItem, Store
} from '../types';
import { AuthService } from '../services/authService';
import { setUnauthorizedHandler } from '../api/client';
import toast from 'react-hot-toast';
import {
  useCurrentUserQuery,
  useProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useOrdersQuery,
  useCreateOrderMutation,
  useUpdateOrderMutation,
  useNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useStoreSettingsQuery,
  useUpdateStoreSettingsMutation,
} from '../hooks/useQueries';

/**
 * Portal destinations the app sends a user to after authentication. Every other
 * value `navigate()` accepts is an ordinary path or page slug — React Router owns
 * routing, and this context no longer keeps a parallel view state beside it.
 */
type PortalView = 'marketing' | 'dashboard' | 'admin' | 'customer-portal';

interface AppContextType {
  // Auth
  user: User | null;
  store: Store | null;
  isAuthenticated: boolean;
  accountType: 'CUSTOMER' | 'SELLER' | 'ADMIN' | null;
  platformRole: 'PLATFORM_OWNER' | 'PLATFORM_ADMIN' | 'PLATFORM_SUPPORT' | null;
  isCustomer: boolean;
  isSeller: boolean;
  isAdmin: boolean;
  login: (email: string, password: string, targetPortal?: 'seller' | 'customer' | 'admin', returnTo?: string | null) => Promise<{ success: boolean; error?: string }>;
  loginWithOAuth: (provider: 'google' | 'github', tokens: { idToken?: string; accessToken?: string }, targetPortal?: 'seller' | 'customer' | 'admin', returnTo?: string | null) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string, storeName?: string, userType?: 'CUSTOMER' | 'SELLER', targetPortal?: 'seller' | 'customer' | 'admin', returnTo?: string | null) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (fields: Partial<User>) => void;
  
  // Navigation
  /** Active portal section, derived from the URL. Navigate to change it. */
  dashboardSection: string;
  navigate: (view: PortalView | string, section?: string) => void;
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  
  // Store Data & Dynamic Inter-Connectivity
  products: Product[];
  orders: Order[];
  customers: Customer[];
  activities: ActivityItem[];
  storeSettings: StoreSettings;

  // Actions
  addProduct: (product: Partial<Product>, options?: { onSuccess?: (data?: any) => void; onError?: (err: any) => void }) => void;
  updateProduct: (id: string, updates: Partial<Product>, options?: { onSuccess?: (data?: any) => void; onError?: (err: any) => void }) => void;
  deleteProduct: (id: string, options?: { onSuccess?: (data?: any) => void; onError?: (err: any) => void }) => void;

  addOrder: (order: Partial<Order>, options?: { onSuccess?: (data?: any) => void; onError?: (err: any) => void }) => void;
  updateOrder: (id: string, updates: Partial<Order>, options?: { onSuccess?: (data?: any) => void; onError?: (err: any) => void }) => void;

  addCustomer: (customer: Partial<Customer>, options?: { onSuccess?: (data?: any) => void; onError?: (err: any) => void }) => void;
  updateCustomer: (id: string, updates: Partial<Customer>, options?: { onSuccess?: (data?: any) => void; onError?: (err: any) => void }) => void;


  updateStoreSettings: (settings: Partial<StoreSettings>, options?: { onSuccess?: (data?: any) => void; onError?: (err: any) => void }) => void;
  addActivity: (message: string, type?: 'order' | 'customer' | 'product' | 'payment', icon?: string) => void;

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  notificationPanelOpen: boolean;
  setNotificationPanelOpen: (open: boolean) => void;
  
  // Loading
  isLoading: boolean;
  /** True while the initial /me session check is still in flight. */
  isSessionLoading: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

const defaultStoreSettings: StoreSettings = {
  storeName: 'Aura Apparel Store',
  storeUrl: 'auraapparel',
  currency: 'USD — US Dollar',
  industry: 'Fashion & Apparel',
  announcementText: '🎉 Flash Sale: Get 20% off all summer collections with code SUMMER20',
  activeTheme: 'nexus-dark',
  primaryColor: '#FFBD2E',
  customDomain: 'auraapparel.com',
};

const PORTAL_PREFIXES = ['seller', 'account', 'admin'];

/**
 * The active section is whatever the router already put in the URL — there is no
 * second source of truth to keep in sync.
 */
function getSectionFromPath(pathname: string): string {
  const [prefix, section] = pathname.replace(/^\//, '').split('/');
  if (!PORTAL_PREFIXES.includes(prefix)) return 'overview';
  if (!section || section === 'dashboard') return 'overview';
  return section;
}

function getUrlForView(view: string, section?: string): string {
  let relPath = '/';
  if (view === 'marketing' || view === '/') relPath = '/';
  else if (view === 'dashboard') relPath = section ? `/seller/${section}` : '/seller/dashboard';
  else if (view === 'admin') relPath = section ? `/admin/${section}` : '/admin/dashboard';
  else if (view === 'admin-login') relPath = '/admin/login';
  else if (view === 'customer-portal') relPath = section ? `/account/${section}` : '/account/dashboard';
  else if (view === 'login') relPath = '/seller/login';
  else if (view === 'signup') relPath = '/seller/register';
  else relPath = view.startsWith('/') ? view : `/${view}`;

  return relPath;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const routerNavigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('nexus_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  // No demo-store fallback: an unauthenticated visitor has no store, and
  // defaulting one here previously made `isSeller` true for every signed-in
  // user — including customers — which broke portal separation entirely.
  const [store, setStore] = useState<Store | null>(() => {
    try {
      const saved = localStorage.getItem('nexus_store');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // The server is the authority on which portal a user belongs to.
  const [accountType, setAccountType] = useState<'CUSTOMER' | 'SELLER' | 'ADMIN' | null>(() => {
    try {
      return (localStorage.getItem('nexus_account_type') as 'CUSTOMER' | 'SELLER' | 'ADMIN') || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('nexus_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('nexus_user');
    }
  }, [user]);

  useEffect(() => {
    if (store) {
      localStorage.setItem('nexus_store', JSON.stringify(store));
    } else {
      localStorage.removeItem('nexus_store');
    }
  }, [store]);

  useEffect(() => {
    if (accountType) {
      localStorage.setItem('nexus_account_type', accountType);
    } else {
      localStorage.removeItem('nexus_account_type');
    }
  }, [accountType]);

  const dashboardSection = useMemo(() => getSectionFromPath(location.pathname), [location.pathname]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Session verification on boot
  const meQuery = useCurrentUserQuery();

  useEffect(() => {
    if (meQuery.data?.user) {
      setUser(meQuery.data.user);
      setStore(meQuery.data.store ?? null);
      setAccountType(meQuery.data.accountType ?? null);
    }
  }, [meQuery.data]);

  // A rejected /me means the cached identity is stale — drop it rather than
  // letting the UI render an authenticated shell with no server session.
  useEffect(() => {
    if (meQuery.isError) {
      setUser(null);
      setStore(null);
      setAccountType(null);
    }
  }, [meQuery.isError]);

  const isAuthenticated = !!user;
  const resolvedAccountType = meQuery.data?.accountType ?? accountType;
  /**
   * The datasets below are the *merchant's* store data, and every one of their
   * endpoints requires store membership. Running them for any signed-in user
   * meant a customer browsing the shop fired six requests that could only ever
   * come back 403 — so they are gated on a verified seller session, not merely
   * on being signed in.
   */
  const isServerAuthenticated =
    isAuthenticated && Boolean(meQuery.data?.user) && resolvedAccountType === 'SELLER';

  // 2. TanStack Query server data
  const productsQuery = useProductsQuery(isServerAuthenticated);
  const customersQuery = useCustomersQuery(isServerAuthenticated);
  const ordersQuery = useOrdersQuery(isServerAuthenticated);
  const notificationsQuery = useNotificationsQuery(isServerAuthenticated);
  const settingsQuery = useStoreSettingsQuery(isServerAuthenticated);

  // Mutations
  const createProductMut = useCreateProductMutation();
  const updateProductMut = useUpdateProductMutation();
  const deleteProductMut = useDeleteProductMutation();

  const createCustomerMut = useCreateCustomerMutation();
  const updateCustomerMut = useUpdateCustomerMutation();

  const createOrderMut = useCreateOrderMutation();
  const updateOrderMut = useUpdateOrderMutation();

  const markReadMut = useMarkNotificationReadMutation();
  const markAllReadMut = useMarkAllNotificationsReadMutation();

  const updateSettingsMut = useUpdateStoreSettingsMutation();

  // Datasets
  const products = productsQuery.data || [];
  const customers = customersQuery.data || [];
  const orders = ordersQuery.data || [];
  const storeSettings = settingsQuery.data || defaultStoreSettings;
  const activities: ActivityItem[] = [];
  const notificationsData = notificationsQuery.data;
  const notifications = Array.isArray(notificationsData) ? notificationsData : notificationsData?.data || [];
  const unreadCount = typeof notificationsData === 'object' && notificationsData !== null && 'unreadCount' in notificationsData
    ? notificationsData.unreadCount
    : notifications.filter(n => !n.read).length;

  const addActivity = useCallback((_message: string, _type: 'order' | 'customer' | 'product' | 'payment' = 'order', _icon = '⚡') => {
    // No-op: the activity feed is derived from server analytics.
  }, []);

  const addProduct = useCallback((p: Partial<Product>, options?: { onSuccess?: (data?: any) => void; onError?: (err: any) => void }) => {
    createProductMut.mutate(p, options);
  }, [createProductMut]);

  const updateProduct = useCallback((id: string, updates: Partial<Product>, options?: { onSuccess?: (data?: any) => void; onError?: (err: any) => void }) => {
    updateProductMut.mutate({ id, updates }, options);
  }, [updateProductMut]);

  const deleteProduct = useCallback((id: string, options?: { onSuccess?: (data?: any) => void; onError?: (err: any) => void }) => {
    deleteProductMut.mutate(id, options);
  }, [deleteProductMut]);

  const addCustomer = useCallback((c: Partial<Customer>, options?: { onSuccess?: (data?: any) => void; onError?: (err: any) => void }) => {
    createCustomerMut.mutate(c, options);
  }, [createCustomerMut]);

  const updateCustomer = useCallback((id: string, updates: Partial<Customer>, options?: { onSuccess?: (data?: any) => void; onError?: (err: any) => void }) => {
    updateCustomerMut.mutate({ id, updates }, options);
  }, [updateCustomerMut]);

  const addOrder = useCallback((o: Partial<Order>, options?: { onSuccess?: (data?: any) => void; onError?: (err: any) => void }) => {
    const orderNumber = o.orderNumber || `#NX-${Math.floor(4000 + Math.random() * 5000)}`;
    const customerName = o.customerName || o.customer?.name || 'Walk-in Customer';
    const customerEmail = o.customerEmail || o.customer?.email || 'customer@nexus.io';
    const total = o.total || 0;
    const subtotal = o.subtotal || total;
    const tax = o.tax || 0;
    const shipping = o.shipping || 0;
    const discount = o.discount || 0;
    const items = o.items || [];
    const shippingAddress = o.shippingAddress || { firstName: 'Customer', lastName: '', address1: 'Main St', city: 'New York', state: 'NY', zip: '10001', country: 'US' };

    createOrderMut.mutate({
      orderNumber,
      customerName,
      customerEmail,
      items,
      total,
      subtotal,
      tax,
      shipping,
      discount,
      shippingAddress,
    }, options);
  }, [createOrderMut]);

  const updateOrder = useCallback((id: string, updates: Partial<Order>, options?: { onSuccess?: (data?: any) => void; onError?: (err: any) => void }) => {
    updateOrderMut.mutate({ id, updates }, options);
  }, [updateOrderMut]);

  const updateStoreSettings = useCallback((settings: Partial<StoreSettings>, options?: { onSuccess?: (data?: any) => void; onError?: (err: any) => void }) => {
    updateSettingsMut.mutate(settings, options);
  }, [updateSettingsMut]);

  /**
   * Adopt a verified server session. The portal a user lands in is decided by
   * the server-reported accountType, not by guessing from `plan` or `store`.
   */
  /**
   * A post-authentication destination the caller asked for, honoured only when
   * the *verified* account type is allowed to open it.
   *
   * This is how a guest who hit checkout gets back to checkout instead of
   * being dropped on a dashboard. It is a redirect, so it is also an open-
   * redirect surface: only an in-app absolute path is accepted, and anything
   * protocol-relative or cross-origin is discarded rather than followed.
   */
  const safeReturnPath = useCallback((
    returnTo: string | null | undefined,
    resolved: 'CUSTOMER' | 'SELLER' | 'ADMIN'
  ): string | null => {
    if (!returnTo) return null;
    if (!returnTo.startsWith('/') || returnTo.startsWith('//')) return null;

    const prefix = returnTo.split('?')[0].split('/')[1] || '';
    // A portal path is only a valid destination for that portal's account type.
    if (prefix === 'seller' && resolved !== 'SELLER') return null;
    if (prefix === 'admin' && resolved !== 'ADMIN') return null;
    if (prefix === 'account' && resolved !== 'CUSTOMER') return null;
    // Checkout belongs to a customer; nobody else can complete one.
    if (prefix === 'checkout' && resolved !== 'CUSTOMER') return null;

    return returnTo;
  }, []);

  const applySession = useCallback((
    result: { user?: User; store?: Store | null; accountType?: 'CUSTOMER' | 'SELLER' | 'ADMIN' },
    requestedPortal: 'seller' | 'customer' | 'admin',
    returnTo?: string | null
  ) => {
    if (!result.user) return;

    const resolved = result.accountType
      ?? ((result.user as any).platformRole ? 'ADMIN' : (result.store ? 'SELLER' : 'CUSTOMER'));

    setUser(result.user);
    setStore(result.store ?? null);
    setAccountType(resolved);
    meQuery.refetch();

    // Honour the portal the user asked for only when their account allows it.
    const targetView: PortalView =
      resolved === 'ADMIN' ? 'admin'
      : resolved === 'SELLER' ? 'dashboard'
      : 'customer-portal';

    if (
      (requestedPortal === 'admin' && resolved !== 'ADMIN') ||
      (requestedPortal === 'seller' && resolved === 'CUSTOMER') ||
      (requestedPortal === 'customer' && resolved === 'SELLER')
    ) {
      toast(`Signed in to your ${resolved.toLowerCase()} account.`);
    }

    routerNavigate(safeReturnPath(returnTo, resolved) ?? getUrlForView(targetView));
  }, [meQuery, routerNavigate, safeReturnPath]);

  const login = useCallback(async (
    email: string,
    password: string,
    targetPortal: 'seller' | 'customer' | 'admin' = 'seller',
    returnTo?: string | null
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const result = await AuthService.login(email, password);
      if (result.success && result.user) {
        applySession(result, targetPortal, returnTo);
      }
      return { success: result.success, error: result.error };
    } finally {
      setIsLoading(false);
    }
  }, [applySession]);

  const loginWithOAuth = useCallback(async (
    provider: 'google' | 'github',
    tokens: { idToken?: string; accessToken?: string },
    targetPortal: 'seller' | 'customer' | 'admin' = 'seller',
    returnTo?: string | null
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const result = await AuthService.loginOAuth(
        provider,
        tokens,
        targetPortal === 'customer' ? 'CUSTOMER' : 'SELLER'
      );
      if (result.success && result.user) {
        applySession(result, targetPortal, returnTo);
      }
      return { success: result.success, error: result.error };
    } finally {
      setIsLoading(false);
    }
  }, [applySession]);

  const signup = useCallback(async (
    name: string,
    email: string,
    password: string,
    storeName?: string,
    userType: 'CUSTOMER' | 'SELLER' = 'SELLER',
    targetPortal: 'seller' | 'customer' | 'admin' = 'seller',
    returnTo?: string | null
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const result = await AuthService.register(name, email, password, storeName, userType);
      if (result.success && result.user) {
        applySession(result, userType === 'CUSTOMER' ? 'customer' : targetPortal, returnTo);
      }
      return { success: result.success, error: result.error };
    } finally {
      setIsLoading(false);
    }
  }, [applySession]);

  const platformRole = (user as any)?.platformRole || null;
  const isAdmin = Boolean(isAuthenticated && accountType === 'ADMIN');
  const isSeller = Boolean(isAuthenticated && accountType === 'SELLER');
  const isCustomer = Boolean(isAuthenticated && accountType === 'CUSTOMER');

  const logout = useCallback(() => {
    AuthService.logoutSession();
    try {
      localStorage.removeItem('nexus_user');
      localStorage.removeItem('nexus_store');
      localStorage.removeItem('nexus_account_type');
    } catch {}
    setUser(null);
    setStore(null);
    setAccountType(null);
    routerNavigate(getUrlForView('marketing'));
  }, [routerNavigate]);

  /**
   * Clear the local session when the server says it is gone.
   *
   * Without this an expired cookie left the app convinced it was signed in:
   * the shell rendered, the guards let the user through, and every query
   * behind them failed with a 401 that surfaced as a page full of error
   * panels. Dropping the local identity hands control back to the route
   * guards, which send the user to the right sign-in page.
   *
   * Deliberately not `logout()`: that posts a logout to the API (pointless —
   * the session is already invalid) and force-navigates to the marketing page,
   * which would yank someone out of a page they could legitimately return to
   * after signing in again.
   */
  useEffect(() => {
    setUnauthorizedHandler(() => {
      try {
        localStorage.removeItem('nexus_user');
        localStorage.removeItem('nexus_store');
        localStorage.removeItem('nexus_account_type');
      } catch {}
      setUser(null);
      setStore(null);
      setAccountType(null);
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  const updateUser = useCallback((fields: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...fields } : null);
  }, []);

  // Scrolling is not done here. `<ScrollRestoration />` handles every
  // navigation, including the <Link> clicks this helper does not cover, so
  // doing it again would start a smooth scroll that the router-level jump then
  // cuts short.
  const navigate = useCallback((view: PortalView | string, section?: string) => {
    const targetUrl = getUrlForView(view, section);
    setMobileMenuOpen(false);
    routerNavigate(targetUrl);
  }, [routerNavigate]);


  const markNotificationRead = useCallback((id: string) => {
    markReadMut.mutate(id);
  }, [markReadMut]);

  const markAllRead = useCallback(() => {
    markAllReadMut.mutate();
  }, [markAllReadMut]);

  return (
    <AppContext.Provider value={{
      user,
      store,
      isAuthenticated,
      accountType,
      platformRole,
      isCustomer,
      isSeller,
      isAdmin,
      login,
      loginWithOAuth,
      signup,
      logout,
      updateUser,
      dashboardSection,
      navigate,
      notifications,
      unreadCount,
      markNotificationRead,
      markAllRead,
      products,
      orders,
      customers,
      activities,
      storeSettings,
      addProduct,
      updateProduct,
      deleteProduct,
      addOrder,
      updateOrder,
      addCustomer,
      updateCustomer,
      updateStoreSettings,
      addActivity,
      sidebarOpen,
      setSidebarOpen,
      mobileMenuOpen,
      setMobileMenuOpen,
      notificationPanelOpen,
      setNotificationPanelOpen,
      isLoading: isLoading || meQuery.isLoading,
      isSessionLoading: meQuery.isLoading,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
