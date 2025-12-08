import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
import { Layout } from "./components/Layout";
import AuthGuard from "./components/AuthGuard";
import Dashboard from "./pages/Dashboard";
import Trucks from "./pages/Trucks";
import Trips from "./pages/Trips";
import Expenses from "./pages/Expenses";
import Invoices from "./pages/Invoices";
import Drivers from "./pages/Drivers";
import ThirdParties from "./pages/ThirdParties";
import Bank from "./pages/Bank";
import Credits from "./pages/Credits";
import Caisse from "./pages/Caisse";
import GPSConfig from "./pages/GPSConfig";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthGuard>
        <AppProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/" element={<Layout><Dashboard /></Layout>} />
              <Route path="/camions" element={<Layout><Trucks /></Layout>} />
              <Route path="/trajets" element={<Layout><Trips /></Layout>} />
              <Route path="/depenses" element={<Layout><Expenses /></Layout>} />
              <Route path="/factures" element={<Layout><Invoices /></Layout>} />
              <Route path="/chauffeurs" element={<Layout><Drivers /></Layout>} />
              <Route path="/tiers" element={<Layout><ThirdParties /></Layout>} />
              <Route path="/banque" element={<Layout><Bank /></Layout>} />
              <Route path="/credits" element={<Layout><Credits /></Layout>} />
              <Route path="/caisse" element={<Layout><Caisse /></Layout>} />
              <Route path="/gps" element={<Layout><GPSConfig /></Layout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </AuthGuard>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
