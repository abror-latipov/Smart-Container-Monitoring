import { useCallback, useEffect, useState } from 'react';
import insforge from './lib/insforge';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ContainerDetails from './pages/ContainerDetails';
import LandingPage from './pages/LandingPage';
import AlertsHistory from './pages/AlertsHistory';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showLogin, setShowLogin] = useState(false);
  const [selectedContainerId, setSelectedContainerId] = useState(null);

  const checkUser = useCallback(async () => {
    try {
      const { data } = await insforge.auth.getCurrentUser();
      if (data?.user) {
        setUser(data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(checkUser, 0);
    return () => clearTimeout(timeout);
  }, [checkUser]);

  const handleLogout = async () => {
    await insforge.auth.signOut();
    setUser(null);
  };

  const navigateToDetails = (id) => {
    setSelectedContainerId(id);
    setCurrentPage('details');
  };

  const navigateBack = () => {
    setSelectedContainerId(null);
    setCurrentPage('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return showLogin ? (
      <Login onLoginSuccess={setUser} />
    ) : (
      <LandingPage onSignInClick={() => setShowLogin(true)} />
    );
  }

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      currentPage={currentPage} 
      onPageChange={setCurrentPage}
    >
      {currentPage === 'dashboard' && <Dashboard onViewDetails={navigateToDetails} />}
      {currentPage === 'details' && (
        <ContainerDetails containerId={selectedContainerId} onBack={navigateBack} />
      )}
      {currentPage === 'alerts' && <AlertsHistory />}
    </Layout>
  );
}

export default App;
