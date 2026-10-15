import { lazy } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import { AuthProvider } from './context/AuthContext';
import { ConfirmProvider } from './context/ConfirmContext';

// Public website (code-split per page)
const HomePage = lazy(() => import('./pages/public/HomePage'));
const FounderPage = lazy(() => import('./pages/public/FounderPage'));
const ServicesPage = lazy(() => import('./pages/public/ServicesPage'));
const ServiceDetailPage = lazy(() => import('./pages/public/ServiceDetailPage'));
const ProductionsPage = lazy(() => import('./pages/public/ProductionsPage'));
const ProductionDetailPage = lazy(() => import('./pages/public/ProductionDetailPage'));
const GalleryPage = lazy(() => import('./pages/public/GalleryPage'));
const NewsPage = lazy(() => import('./pages/public/NewsPage'));
const NewsDetailPage = lazy(() => import('./pages/public/NewsDetailPage'));
const SearchPage = lazy(() => import('./pages/public/SearchPage'));
const ContactPage = lazy(() => import('./pages/public/ContactPage'));
const EnquirePage = lazy(() => import('./pages/public/EnquirePage'));
const PartnerPage = lazy(() => import('./pages/public/PartnerPage'));
const JoinTalentPage = lazy(() => import('./pages/public/JoinTalentPage'));
const NotFoundPage = lazy(() => import('./pages/public/NotFoundPage'));

// Staff authentication
const AuthLayout = lazy(() => import('./layouts/AuthLayout'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const AcceptInvitePage = lazy(() => import('./pages/auth/AcceptInvitePage'));
const MfaRecoveryPage = lazy(() => import('./pages/auth/MfaRecoveryPage'));

// Staff workspace
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const WebsiteHubPage = lazy(() => import('./pages/admin/WebsiteHubPage'));
const HomepageAdminPage = lazy(() => import('./pages/admin/website/HomepageAdminPage'));
const HeroAdminPage = lazy(() => import('./pages/admin/website/HeroAdminPage'));
const TickerAdminPage = lazy(() => import('./pages/admin/website/TickerAdminPage'));
const FounderAdminPage = lazy(() => import('./pages/admin/website/FounderAdminPage'));
const FounderGalleryAdminPage = lazy(() => import('./pages/admin/website/FounderGalleryAdminPage'));
const GalleryAdminPage = lazy(() => import('./pages/admin/website/GalleryAdminPage'));
const ServicesAdminPage = lazy(() => import('./pages/admin/website/ServicesAdminPage'));
const ServiceEditorPage = lazy(() => import('./pages/admin/website/ServiceEditorPage'));
const ProductionsAdminPage = lazy(() => import('./pages/admin/website/ProductionsAdminPage'));
const ProductionEditorPage = lazy(() => import('./pages/admin/website/ProductionEditorPage'));
const NewsAdminPage = lazy(() => import('./pages/admin/website/NewsAdminPage'));
const NewsEditorPage = lazy(() => import('./pages/admin/website/NewsEditorPage'));
const CtasAdminPage = lazy(() => import('./pages/admin/website/CtasAdminPage'));
const PartnerAdminPage = lazy(() => import('./pages/admin/website/PartnerAdminPage'));
const MediaLibraryPage = lazy(() => import('./pages/admin/MediaLibraryPage'));
const EnquiriesPage = lazy(() => import('./pages/admin/enquiries/EnquiriesPage'));
const EnquiryDetailPage = lazy(() => import('./pages/admin/enquiries/EnquiryDetailPage'));
const MessagesPage = lazy(() => import('./pages/admin/enquiries/MessagesPage'));
const ContactsPage = lazy(() => import('./pages/admin/crm/ContactsPage'));
const ContactDetailPage = lazy(() => import('./pages/admin/crm/ContactDetailPage'));
const StaffPage = lazy(() => import('./pages/admin/team/StaffPage'));
const RolesPage = lazy(() => import('./pages/admin/team/RolesPage'));
const SettingsPage = lazy(() => import('./pages/admin/settings/SettingsPage'));
const IntegrationsPage = lazy(() => import('./pages/admin/settings/IntegrationsPage'));
const AuditLogPage = lazy(() => import('./pages/admin/settings/AuditLogPage'));
const SecurityPage = lazy(() => import('./pages/admin/account/SecurityPage'));
const HelpPage = lazy(() => import('./pages/admin/HelpPage'));
const MfaSetupPage = lazy(() => import('./pages/admin/account/MfaSetupPage'));
const ProjectsPage = lazy(() => import('./pages/admin/projects/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('./pages/admin/projects/ProjectDetailPage'));
const ClientsPage = lazy(() => import('./pages/admin/clients/ClientsPage'));
const InvoicesPage = lazy(() => import('./pages/admin/invoices/InvoicesPage'));
const InvoiceEditorPage = lazy(() => import('./pages/admin/invoices/InvoiceEditorPage'));
const InvoiceDetailPage = lazy(() => import('./pages/admin/invoices/InvoiceDetailPage'));
const BillingSettingsPage = lazy(() => import('./pages/admin/invoices/BillingSettingsPage'));
const TalentRosterPage = lazy(() => import('./pages/admin/talent/TalentRosterPage'));
const TalentProfilePage = lazy(() => import('./pages/admin/talent/TalentProfilePage'));
const CastingsPage = lazy(() => import('./pages/admin/talent/CastingsPage'));
const CastingDetailPage = lazy(() => import('./pages/admin/talent/CastingDetailPage'));
const BookingsPage = lazy(() => import('./pages/admin/talent/BookingsPage'));
const BookingDetailPage = lazy(() => import('./pages/admin/talent/BookingDetailPage'));

// Client portal
const PortalLayout = lazy(() => import('./layouts/PortalLayout'));
const PortalHomePage = lazy(() => import('./pages/portal/PortalHomePage'));
const PortalProjectPage = lazy(() => import('./pages/portal/PortalProjectPage'));
const PortalInvoicesPage = lazy(() => import('./pages/portal/PortalInvoicesPage'));
const PortalInvoicePage = lazy(() => import('./pages/portal/PortalInvoicePage'));

// Talent portal
const TalentLayout = lazy(() => import('./layouts/TalentLayout'));
const TalentHomePage = lazy(() => import('./pages/talent/TalentHomePage'));
const TalentProfileEditPage = lazy(() => import('./pages/talent/TalentProfileEditPage'));
const TalentCastingsPage = lazy(() => import('./pages/talent/TalentCastingsPage'));
const TalentCastingPage = lazy(() => import('./pages/talent/TalentCastingPage'));
const TalentBookingsPage = lazy(() => import('./pages/talent/TalentBookingsPage'));
const TalentBookingPage = lazy(() => import('./pages/talent/TalentBookingPage'));
const TalentDocumentsPage = lazy(() => import('./pages/talent/TalentDocumentsPage'));

/** Session-aware branch: only staff/auth routes ever call the session endpoints. */
function StaffArea() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <Outlet />
      </ConfirmProvider>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<Navigate to="/about/founder" replace />} />
        <Route path="about/founder" element={<FounderPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="services/:slug" element={<ServiceDetailPage />} />
        <Route path="productions" element={<ProductionsPage />} />
        <Route path="productions/:slug" element={<ProductionDetailPage />} />
        <Route path="gallery" element={<GalleryPage />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="news/:slug" element={<NewsDetailPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="enquire" element={<EnquirePage />} />
        <Route path="partner" element={<PartnerPage />} />
        <Route path="join-talent" element={<JoinTalentPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route element={<StaffArea />}>
        <Route element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="accept-invite" element={<AcceptInvitePage />} />
          <Route path="mfa-recovery" element={<MfaRecoveryPage mode="confirm" />} />
          <Route path="mfa-recovery/cancel" element={<MfaRecoveryPage mode="cancel" />} />
        </Route>

        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="website" element={<WebsiteHubPage />} />
          <Route path="website/homepage" element={<HomepageAdminPage />} />
          <Route path="website/hero" element={<HeroAdminPage />} />
          <Route path="website/ticker" element={<TickerAdminPage />} />
          <Route path="website/founder" element={<FounderAdminPage />} />
          <Route path="website/founder-gallery" element={<FounderGalleryAdminPage />} />
          <Route path="website/gallery" element={<GalleryAdminPage />} />
          <Route path="website/services" element={<ServicesAdminPage />} />
          <Route path="website/services/:id" element={<ServiceEditorPage />} />
          <Route path="website/productions" element={<ProductionsAdminPage />} />
          <Route path="website/productions/:id" element={<ProductionEditorPage />} />
          <Route path="website/news" element={<NewsAdminPage />} />
          <Route path="website/news/:id" element={<NewsEditorPage />} />
          <Route path="website/ctas" element={<CtasAdminPage />} />
          <Route path="website/partner" element={<PartnerAdminPage />} />
          <Route path="media" element={<MediaLibraryPage />} />
          <Route path="enquiries" element={<EnquiriesPage />} />
          <Route path="enquiries/:id" element={<EnquiryDetailPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="contacts/:id" element={<ContactDetailPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/new" element={<InvoiceEditorPage />} />
          <Route path="invoices/settings" element={<BillingSettingsPage />} />
          <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="invoices/:id/edit" element={<InvoiceEditorPage />} />
          <Route path="talent" element={<TalentRosterPage />} />
          <Route path="talent/:id" element={<TalentProfilePage />} />
          <Route path="castings" element={<CastingsPage />} />
          <Route path="castings/:id" element={<CastingDetailPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="bookings/:id" element={<BookingDetailPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="integrations" element={<IntegrationsPage />} />
          <Route path="audit" element={<AuditLogPage />} />
          <Route path="security" element={<SecurityPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="security/setup-mfa" element={<MfaSetupPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>

        <Route path="portal" element={<PortalLayout />}>
          <Route index element={<PortalHomePage />} />
          <Route path="projects/:id" element={<PortalProjectPage />} />
          <Route path="invoices" element={<PortalInvoicesPage />} />
          <Route path="invoices/:id" element={<PortalInvoicePage />} />
          <Route path="account" element={<SecurityPage />} />
          <Route path="account/setup-mfa" element={<MfaSetupPage />} />
                    <Route path="*" element={<Navigate to="/portal" replace />} />
        </Route>

        <Route path="talent" element={<TalentLayout />}>
          <Route index element={<TalentHomePage />} />
          <Route path="profile" element={<TalentProfileEditPage />} />
          <Route path="castings" element={<TalentCastingsPage />} />
          <Route path="castings/:id" element={<TalentCastingPage />} />
          <Route path="bookings" element={<TalentBookingsPage />} />
          <Route path="bookings/:id" element={<TalentBookingPage />} />
          <Route path="documents" element={<TalentDocumentsPage />} />
          <Route path="account" element={<SecurityPage />} />
          <Route path="account/setup-mfa" element={<MfaSetupPage />} />
          <Route path="*" element={<Navigate to="/talent" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
