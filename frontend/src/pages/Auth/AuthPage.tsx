import { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function AuthPage() {
  const location = useLocation();
  const isLogin = location.pathname === '/login';
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const { user, loginLocal } = useAuthStore();

  if (user) return <Navigate to="/me" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError('请输入手机号');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await loginLocal(phone.trim());
      navigate('/me', { replace: true });
    } catch {
      setError('登录失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-20 px-4 space-y-10">
      <h1 className="page-title text-3xl text-center text-gray-900">即搭</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <input
          type="tel"
          placeholder="手机号"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="w-full px-4 py-3.5 rounded-2xl border border-gray-100 bg-white/80 outline-none focus:border-brand text-center"
        />

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 rounded-full bg-brand text-white font-medium shadow-md shadow-brand/20 disabled:opacity-50"
        >
          {submitting ? '登录中...' : isLogin ? '登录' : '注册'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        {isLogin ? '还没有账号？' : '已有账号？'}
        <Link
          to={isLogin ? '/register' : '/login'}
          className="text-brand hover:underline ml-1"
        >
          {isLogin ? '注册' : '登录'}
        </Link>
      </p>
    </div>
  );
}
