import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import { ProtectedRoute, RoleRoute } from './ProtectedRoute';
import { Spinner } from '../components/ui/Loading';
import NotFoundPage from '../pages/NotFoundPage';

const Home = lazy(() => import('../pages/Home'));
const HotelList = lazy(() => import('../pages/hotels/HotelList'));
const HotelDetail = lazy(() => import('../pages/hotels/HotelDetail'));
const Login = lazy(() => import('../pages/auth/Login'));
const Register = lazy(() => import('../pages/auth/Register'));
const Checkout = lazy(() => import('../pages/bookings/Checkout'));
const PayNow = lazy(() => import('../pages/bookings/PayNow'));
const BookingConfirmation = lazy(() => import('../pages/bookings/BookingConfirmation'));

const DashboardHome = lazy(() => import('../pages/dashboard/DashboardHome'));
const MyBookings = lazy(() => import('../pages/dashboard/MyBookings'));
const BookingDetail = lazy(() => import('../pages/dashboard/BookingDetail'));
const Wishlist = lazy(() => import('../pages/dashboard/Wishlist'));
const MyReviews = lazy(() => import('../pages/dashboard/MyReviews'));
const Notifications = lazy(() => import('../pages/dashboard/Notifications'));
const Settings = lazy(() => import('../pages/dashboard/Settings'));

const OwnerDashboard = lazy(() => import('../pages/owner/OwnerDashboard'));
const OwnerProperties = lazy(() => import('../pages/owner/OwnerProperties'));
const OwnerPropertyForm = lazy(() => import('../pages/owner/OwnerPropertyForm'));
const OwnerPropertyDetail = lazy(() => import('../pages/owner/OwnerPropertyDetail'));
const OwnerBookings = lazy(() => import('../pages/owner/OwnerBookings'));
const OwnerRevenue = lazy(() => import('../pages/owner/OwnerRevenue'));
const OwnerReviews = lazy(() => import('../pages/owner/OwnerReviews'));

const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('../pages/admin/AdminUsers'));
const AdminHotels = lazy(() => import('../pages/admin/AdminHotels'));
const AdminBookings = lazy(() => import('../pages/admin/AdminBookings'));
const AdminPayments = lazy(() => import('../pages/admin/AdminPayments'));
const AdminReviews = lazy(() => import('../pages/admin/AdminReviews'));
const AdminCoupons = lazy(() => import('../pages/admin/AdminCoupons'));
const AdminReports = lazy(() => import('../pages/admin/AdminReports'));
const AdminAuditLogs = lazy(() => import('../pages/admin/AdminAuditLogs'));

export default function AppRoutes() {
  return (
    <Suspense fallback={<Spinner label="Loading" className="min-h-screen" />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="hotels" element={<HotelList />} />
          <Route path="hotels/:identifier" element={<HotelDetail />} />
          <Route path="auth/login" element={<Login />} />
          <Route path="auth/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route path="bookings/checkout" element={<Checkout />} />
            <Route path="bookings/pay/:id" element={<PayNow />} />
            <Route path="bookings/confirmation/:id" element={<BookingConfirmation />} />
            <Route path="checkout/:bookingId" element={<PayNow />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="dashboard" element={<DashboardHome />} />
            <Route path="dashboard/bookings" element={<MyBookings />} />
            <Route path="dashboard/bookings/:id" element={<BookingDetail />} />
            <Route path="dashboard/wishlist" element={<Wishlist />} />
            <Route path="dashboard/reviews" element={<MyReviews />} />
            <Route path="dashboard/notifications" element={<Notifications />} />
            <Route path="dashboard/profile" element={<Navigate to="/dashboard/settings" replace />} />
            <Route path="dashboard/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route element={<RoleRoute roles={['owner']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="owner" element={<OwnerDashboard />} />
            <Route path="owner/properties" element={<OwnerProperties />} />
            <Route path="owner/properties/new" element={<OwnerPropertyForm />} />
            <Route path="owner/properties/:id" element={<OwnerPropertyDetail />} />
            <Route path="owner/properties/:id/edit" element={<OwnerPropertyForm />} />
            <Route path="owner/bookings" element={<OwnerBookings />} />
            <Route path="owner/revenue" element={<OwnerRevenue />} />
            <Route path="owner/reviews" element={<OwnerReviews />} />
          </Route>
        </Route>

        <Route element={<RoleRoute roles={['admin']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/users" element={<AdminUsers />} />
            <Route path="admin/hotels" element={<AdminHotels />} />
            <Route path="admin/bookings" element={<AdminBookings />} />
            <Route path="admin/payments" element={<AdminPayments />} />
            <Route path="admin/reviews" element={<AdminReviews />} />
            <Route path="admin/coupons" element={<AdminCoupons />} />
            <Route path="admin/reports" element={<AdminReports />} />
            <Route path="admin/audit-logs" element={<AdminAuditLogs />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
