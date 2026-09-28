// Tabel route Tenant App (dipakai createBrowserRouter & validasi deep link notifikasi — B-01). Guard: auth, wajib ganti password.
import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Outlet, useLocation, type RouteObject } from "react-router-dom";
import { useAuth } from "./auth";
import { Logo } from "@/components/illustrations";

const Onboarding = lazy(() => import("@/features/onboarding/OnboardingPage"));
const LoginPage = lazy(() => import("@/features/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/features/auth/RegisterPage"));
const ValidationPage = lazy(() => import("@/features/auth/ValidationPage"));
const HomePage = lazy(() => import("@/features/home/HomePage"));
const ReportLayout = lazy(() => import("@/features/report/ReportLayout"));
const PhotoStep = lazy(() => import("@/features/report/PhotoStep"));
const CategoryStep = lazy(() => import("@/features/report/CategoryStep"));
const DescribeStep = lazy(() => import("@/features/report/DescribeStep"));
const LocationStep = lazy(() => import("@/features/report/LocationStep"));
const ConfirmStep = lazy(() => import("@/features/report/ConfirmStep"));
const SuccessPage = lazy(() => import("@/features/report/SuccessPage"));
const RequestsPage = lazy(() => import("@/features/requests/RequestsPage"));
const RequestDetailPage = lazy(() => import("@/features/requests/RequestDetailPage"));
const FacilitiesPage = lazy(() => import("@/features/facilities/FacilitiesPage"));
const FacilityBookingPage = lazy(() => import("@/features/facilities/FacilityBookingPage"));
const BookingDetailPage = lazy(() => import("@/features/facilities/BookingDetailPage"));
const VisitorsPage = lazy(() => import("@/features/visitors/VisitorsPage"));
const NewVisitorPage = lazy(() => import("@/features/visitors/NewVisitorPage"));
const VisitorDetailPage = lazy(() => import("@/features/visitors/VisitorDetailPage"));
const InboxPage = lazy(() => import("@/features/inbox/InboxPage"));
const AnnouncementPage = lazy(() => import("@/features/inbox/AnnouncementPage"));
const AccountPage = lazy(() => import("@/features/account/AccountPage"));
const ChangePasswordPage = lazy(() => import("@/features/account/ChangePasswordPage"));
const EditProfilePage = lazy(() => import("@/features/account/EditProfilePage"));
const NotificationSettingsPage = lazy(() => import("@/features/account/NotificationSettingsPage"));
const MembersPage = lazy(() => import("@/features/account/MembersPage"));
const UnitsPage = lazy(() => import("@/features/units/UnitsPage"));
const UnitDetailPage = lazy(() => import("@/features/units/UnitDetailPage"));
const PackagesPage = lazy(() => import("@/features/packages/PackagesPage"));
const PackageDetailPage = lazy(() => import("@/features/packages/PackageDetailPage"));
const ParkingPage = lazy(() => import("@/features/parking/ParkingPage"));
const VehicleFormPage = lazy(() => import("@/features/parking/VehicleFormPage"));
const VehicleDetailPage = lazy(() => import("@/features/parking/VehicleDetailPage"));
const PermitRequestPage = lazy(() => import("@/features/parking/PermitRequestPage"));
const PermitDetailPage = lazy(() => import("@/features/parking/PermitDetailPage"));
const FeedbackListPage = lazy(() => import("@/features/feedback/FeedbackListPage"));
const NewFeedbackPage = lazy(() => import("@/features/feedback/NewFeedbackPage"));
const FeedbackDetailPage = lazy(() => import("@/features/feedback/FeedbackDetailPage"));
const BillsPage = lazy(() => import("@/features/bills/BillsPage"));
const BillDetailPage = lazy(() => import("@/features/bills/BillDetailPage"));
const StatementPage = lazy(() => import("@/features/bills/StatementPage"));

export function Splash() {
  return (
    <div className="app-shell flex min-h-dvh flex-col items-center justify-center gap-3">
      <Logo size={72} />
      <div className="text-lg font-bold text-brand-700">BuildingVision</div>
      <div className="h-1 w-24 overflow-hidden rounded-full bg-brand-100">
        <div className="h-full w-1/2 animate-[bv-slide_1s_ease-in-out_infinite] bg-brand-500" />
      </div>
      <style>{`@keyframes bv-slide{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}`}</style>
    </div>
  );
}

/** Wajib login; akun dengan password sementara diarahkan ke Ganti Password sampai selesai (P3-ACC-03). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready, onboarded } = useAuth();
  const loc = useLocation();
  if (!ready) return <Splash />;
  if (!user) return <Navigate to={onboarded ? "/login" : "/welcome"} replace state={{ from: loc.pathname + loc.search }} />;
  if (user.must_change_password && loc.pathname !== "/account/password") return <Navigate to="/account/password" replace state={{ from: loc.pathname + loc.search }} />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <Splash />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Lazy() {
  return (
    <Suspense fallback={<Splash />}>
      <Outlet />
    </Suspense>
  );
}

function LegacyRequestRedirect() {
  const loc = useLocation();
  return <Navigate to={loc.pathname.replace(/^\/history/, "/requests")} replace />;
}

function NotFound() {
  return (
    <div className="app-shell flex min-h-dvh flex-col items-center justify-center gap-2 p-6 text-center">
      <div className="text-4xl font-extrabold text-brand-600">404</div>
      <div className="text-muted-foreground">Halaman tidak ditemukan.</div>
      <a href="/" className="mt-3 font-bold text-brand-600">
        Kembali ke Beranda
      </a>
    </div>
  );
}

export const routes: RouteObject[] = [
  {
    element: <Lazy />,
    children: [
      { path: "/welcome", element: <PublicOnly><Onboarding /></PublicOnly> },
      { path: "/login", element: <PublicOnly><LoginPage /></PublicOnly> },
      { path: "/register", element: <PublicOnly><RegisterPage /></PublicOnly> },
      { path: "/register/validation", element: <PublicOnly><ValidationPage /></PublicOnly> },
      {
        element: (
          <RequireAuth>
            <Outlet />
          </RequireAuth>
        ),
        children: [
          { path: "/", element: <HomePage /> },
          {
            path: "/report",
            element: <ReportLayout />,
            children: [
              { index: true, element: <Navigate to="/report/location" replace /> },
              { path: "location", element: <LocationStep /> },
              { path: "category", element: <CategoryStep /> },
              { path: "describe", element: <DescribeStep /> },
              { path: "photo", element: <PhotoStep /> },
              { path: "confirm", element: <ConfirmStep /> },
            ],
          },
          { path: "/report/success/:id", element: <SuccessPage /> },
          { path: "/requests", element: <RequestsPage /> },
          { path: "/requests/:id", element: <RequestDetailPage /> },
          { path: "/history", element: <Navigate to="/requests" replace /> },
          { path: "/history/:id", element: <LegacyRequestRedirect /> },
          { path: "/facilities", element: <FacilitiesPage /> },
          { path: "/facilities/bookings/:id", element: <BookingDetailPage /> },
          { path: "/facilities/:id", element: <FacilityBookingPage /> },
          { path: "/visitors", element: <VisitorsPage /> },
          { path: "/visitors/new", element: <NewVisitorPage /> },
          { path: "/visitors/:id", element: <VisitorDetailPage /> },
          { path: "/packages", element: <PackagesPage /> },
          { path: "/packages/:id", element: <PackageDetailPage /> },
          { path: "/parking", element: <ParkingPage /> },
          { path: "/parking/vehicles/new", element: <VehicleFormPage /> },
          { path: "/parking/vehicles/:id", element: <VehicleDetailPage /> },
          { path: "/parking/vehicles/:id/edit", element: <VehicleFormPage /> },
          { path: "/parking/permits/new", element: <PermitRequestPage /> },
          { path: "/parking/permits/:id", element: <PermitDetailPage /> },
          { path: "/feedback", element: <FeedbackListPage /> },
          { path: "/feedback/new", element: <NewFeedbackPage /> },
          { path: "/feedback/:id", element: <FeedbackDetailPage /> },
          { path: "/units", element: <UnitsPage /> },
          { path: "/units/:id", element: <UnitDetailPage /> },
          { path: "/inbox", element: <InboxPage /> },
          { path: "/inbox/announcements/:id", element: <AnnouncementPage /> },
          { path: "/account", element: <AccountPage /> },
          { path: "/account/password", element: <ChangePasswordPage /> },
          { path: "/account/profile", element: <EditProfilePage /> },
          { path: "/account/notifications", element: <NotificationSettingsPage /> },
          { path: "/account/members", element: <MembersPage /> },
          { path: "/bills", element: <BillsPage /> },
          { path: "/bills/statement", element: <StatementPage /> },
          { path: "/bills/:id", element: <BillDetailPage /> },
          // B-01: deep link lama dari server
          { path: "/profile", element: <Navigate to="/account" replace /> },
          { path: "/home", element: <Navigate to="/" replace /> },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
];
