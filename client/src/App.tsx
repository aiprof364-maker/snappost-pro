import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import CookieConsent from "@/components/CookieConsent";
import { trackGooglePageView } from "@/lib/googleAnalytics";
import { lazy, Suspense, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Each page is its own chunk. A marketing visit must not download dashboard,
// editor, admin, or charting code before the visitor navigates there.
const Home = lazy(() => import("./pages/Home"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Features = lazy(() => import("./pages/Features"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Analytics = lazy(() => import("./pages/Analytics"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminLeads = lazy(() => import("./pages/AdminLeads"));
const Contact = lazy(() => import("./pages/Contact"));
const Changelog = lazy(() => import("./pages/Changelog"));
const Privacy = lazy(() => import("./pages/Privacy"));
const DeleteAccount = lazy(() => import("./pages/DeleteAccount"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Login = lazy(() => import("./pages/Login"));
const Contractors = lazy(() => import("./pages/Contractors"));
const Hairdressers = lazy(() => import("./pages/Hairdressers"));
const FreePreview = lazy(() => import("./pages/FreePreview"));
const NotFound = lazy(() => import("./pages/NotFound"));

function PageFallback() {
  return <div className="min-h-screen bg-background" aria-busy="true" />;
}

function Router() {
  const [location] = useLocation();

  useEffect(() => {
    trackGooglePageView();
  }, [location]);

  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/features"} component={Features} />
        <Route path={"/contractors"} component={Contractors} />
        <Route path={"/hairdressers"} component={Hairdressers} />
        <Route path={"/preview"} component={FreePreview} />
        <Route path={"/pricing"} component={Pricing} />
        <Route path={"/dashboard"} component={Dashboard} />
        <Route path={"/analytics"} component={Analytics} />
        <Route path={"/admin"} component={AdminDashboard} />
        <Route path={"/admin/leads"} component={AdminLeads} />
        <Route path={"/contact"} component={Contact} />
        <Route path={"/changelog"} component={Changelog} />
        <Route path={"/privacy"} component={Privacy} />
        <Route path={"/delete-account"} component={DeleteAccount} />
        <Route path={"/verify-email"} component={VerifyEmail} />
        <Route path={"/login"} component={Login} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <CookieConsent />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
