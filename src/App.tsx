import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";

// Main pages
import Dashboard from "./pages/Dashboard";
import Sources from "./pages/Sources";
import Datasets from "./pages/Datasets";
import Transformations from "./pages/Transformations";
import Destinations from "./pages/Destinations";
import Jobs from "./pages/Jobs";
import DataStorage from "./pages/DataStorage";
import AIInsights from "./pages/AIInsights";
import Help from "./pages/Help";
import Settings from "./pages/Settings";

// Auth pages
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Verify from "./pages/auth/Verify";

// Other pages
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  // Set dark mode based on system preference
  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* App routes with Layout */}
            <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
            <Route path="/sources" element={<Layout><Sources /></Layout>} />
            <Route path="/datasets" element={<Layout><Datasets /></Layout>} />
            <Route path="/transformations" element={<Layout><Transformations /></Layout>} />
            <Route path="/destinations" element={<Layout><Destinations /></Layout>} />
            <Route path="/jobs" element={<Layout><Jobs /></Layout>} />
            <Route path="/data-storage" element={<Layout><DataStorage /></Layout>} />
            <Route path="/ai-insights" element={<Layout><AIInsights /></Layout>} />
            <Route path="/help" element={<Layout><Help /></Layout>} />
            <Route path="/settings" element={<Layout><Settings /></Layout>} />
            
            {/* Auth routes */}
            <Route path="/auth/signin" element={<SignIn />} />
            <Route path="/auth/signup" element={<SignUp />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/auth/verify" element={<Verify />} />
            
            {/* 404 page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
