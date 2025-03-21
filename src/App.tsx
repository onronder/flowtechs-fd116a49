
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { AuthProvider } from "@/context/AuthContext";
import { AuthRoute } from "@/components/auth/AuthRoute";

// Main pages
import Dashboard from "./pages/Dashboard";
import Sources from "./pages/Sources";
import AddSource from "./pages/AddSource";
import EditSource from "./pages/EditSource";
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
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public auth routes */}
              <Route path="/auth/signin" element={<SignIn />} />
              <Route path="/auth/signup" element={<SignUp />} />
              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/auth/verify" element={<Verify />} />
              
              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* Protected app routes with Layout */}
              <Route path="/dashboard" element={<AuthRoute><Layout><Dashboard /></Layout></AuthRoute>} />
              <Route path="/sources" element={<AuthRoute><Layout><Sources /></Layout></AuthRoute>} />
              <Route path="/sources/new" element={<AuthRoute><Layout><AddSource /></Layout></AuthRoute>} />
              <Route path="/sources/:id/edit" element={<AuthRoute><Layout><EditSource /></Layout></AuthRoute>} />
              <Route path="/datasets" element={<AuthRoute><Layout><Datasets /></Layout></AuthRoute>} />
              <Route path="/transformations" element={<AuthRoute><Layout><Transformations /></Layout></AuthRoute>} />
              <Route path="/destinations" element={<AuthRoute><Layout><Destinations /></Layout></AuthRoute>} />
              <Route path="/jobs" element={<AuthRoute><Layout><Jobs /></Layout></AuthRoute>} />
              <Route path="/data-storage" element={<AuthRoute><Layout><DataStorage /></Layout></AuthRoute>} />
              <Route path="/ai-insights" element={<AuthRoute><Layout><AIInsights /></Layout></AuthRoute>} />
              <Route path="/help" element={<AuthRoute><Layout><Help /></Layout></AuthRoute>} />
              <Route path="/settings" element={<AuthRoute><Layout><Settings /></Layout></AuthRoute>} />
              
              {/* 404 page */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
};

export default App;
