import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './context/AppContext';
import { AppRouter } from './app/router/AppRouter';

export default function App() {
  const basename = typeof window !== 'undefined' && window.location.pathname.startsWith('/nexus') ? '/nexus' : undefined;

  return (
    <BrowserRouter basename={basename}>
      <AppProvider>
        <AppRouter />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </AppProvider>
    </BrowserRouter>
  );
}
