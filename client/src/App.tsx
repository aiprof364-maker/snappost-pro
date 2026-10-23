import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import CookieConsent from "@/components/CookieConsent";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Pricing from "./pages/Pricing";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLeads from "./pages/AdminLeads";
import Contact from "./pages/Contact";
import Changelog from "./pages/Changelog";
import Privacy from "./pages/Privacy";
import DeleteAccount from "./pages/DeleteAccount";
import VerifyEmail from "./pages/VerifyEmail";
import Login from "./pages/Login";
import Contractors from "./pages/Contractors";
import Hairdressers from "./pages/Hairdressers";
import FreePreview from "./pages/FreePreview";
import { trackGooglePageView } from "@/lib/googleAnalytics";
import { useEffect } from "react";
import { useLocation } from "wouter";

function Router() {
  const [location] = useLocation();

  useEffect(() => {
    trackGooglePageView();
  }, [location]);

  return (
    <Switch>
      <Route path={"/"} component={Home} />
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
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
          <CookieConsent />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
