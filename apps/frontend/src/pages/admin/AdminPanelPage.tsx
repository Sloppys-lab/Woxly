import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminPanel from '../app/components/AdminPanel';
import { adminAxios } from '../../utils/adminAxios';

export default function AdminPanelPage() {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminAuth = async () => {
      const adminToken = localStorage.getItem('admin-access-token');
      
      if (!adminToken) {
        navigate('/admin/login');
        return;
      }

      // Проверяем токен, пытаясь сделать запрос
      try {
        await adminAxios.get('/admin/stats');
        setIsAuthorized(true);
      } catch (error: any) {
        // Если токен недействителен, interceptor попытается обновить его
        if (error.response?.status === 401) {
          navigate('/admin/login');
        } else {
          navigate('/admin/login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAdminAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#dc143c] via-[#ff4d6d] to-[#dc143c] blur-2xl opacity-50 rounded-full animate-pulse" />
            <div className="relative h-16 w-16 rounded-full border-4 border-[#dc143c]/20 border-t-[#dc143c] animate-spin" />
          </div>
          <p className="text-muted-foreground font-medium">Загрузка админ-панели...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <AdminPanel />;
}

