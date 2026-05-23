import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Plus, MessageCircle, User, CloudSun } from '../Icons/Icons';
import { useAuthStore } from '../../stores/authStore';

interface LayoutProps {
  children: React.ReactNode;
}

const tabs = [
  { path: '/', label: '首页', icon: Home },
  { path: '/advisor', label: '顾问', icon: CloudSun },
  { path: '__fab__', label: '', icon: Plus, fab: true },
  { path: '/community', label: '社区', icon: MessageCircle },
  { path: '/me', label: '我的', icon: User, auth: true },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const isActive = (path: string) => {
    if (path === '/me') return location.pathname === '/me' || location.pathname === '/login' || location.pathname === '/register';
    return location.pathname === path;
  };

  return (
    <div
      className="min-h-screen flex flex-col max-w-lg mx-auto shadow-sm relative bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url(/site-bg.png)' }}
    >
      <main className="relative flex-1 pb-20">{children}</main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white/95 backdrop-blur border-t border-gray-100 flex items-end justify-around px-2 pt-2 pb-3 z-50">
        {tabs.map((tab) => {
          if (tab.fab) {
            return (
              <button
                key="fab"
                type="button"
                onClick={() => navigate('/?tryon=1')}
                className="-mt-5 w-14 h-14 rounded-full bg-brand text-white shadow-lg shadow-brand/30 flex items-center justify-center hover:bg-brand-dark transition-colors"
              >
                <Plus size={28} strokeWidth={2.5} />
              </button>
            );
          }

          const Icon = tab.icon;
          const path = tab.auth ? (user ? '/me' : '/login') : tab.path;
          const active = tab.auth ? isActive('/me') : isActive(tab.path);

          return (
            <Link
              key={tab.path}
              to={path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 min-w-[56px] ${
                active ? 'text-brand' : 'text-gray-400'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px]">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}