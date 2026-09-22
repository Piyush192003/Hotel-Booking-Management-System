import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe } from './features/auth/authSlice';
import { fetchUnreadCount } from './features/notifications/notificationsSlice';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  const dispatch = useDispatch();
  const { status } = useSelector((s) => s.auth);

  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  useEffect(() => {
    if (status !== 'authenticated') return undefined;
    dispatch(fetchUnreadCount());
    // Keep the navbar bell badge fresh (every 60s while logged in).
    const id = setInterval(() => dispatch(fetchUnreadCount()), 60000);
    return () => clearInterval(id);
  }, [dispatch, status]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
