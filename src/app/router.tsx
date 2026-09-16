import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate, Outlet, useLocation } from "react-router-dom";
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
const BillsPage = lazy(() => import("@/features/bills/BillsPage"));
const BillDetailPage = lazy(() => import("@/features/bills/BillDetailPage"));

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

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready, onboarded } = useAuth();
  const loc = useLocation();
  if (!ready) return <Splash />;
  if (!user) return <Navigate to={onboarded ? "/login" : "/welcome"} replace state={{ from: loc.pathname }} />;
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

export const router = createBrowserRouter([
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
          { path: "/inbox", element: <InboxPage /> },
          { path: "/inbox/announcements/:id", element: <AnnouncementPage /> },
          { path: "/account", element: <AccountPage /> },
          { path: "/account/password", element: <ChangePasswordPage /> },
          { path: "/bills", element: <BillsPage /> },
          { path: "/bills/:id", element: <BillDetailPage /> },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
