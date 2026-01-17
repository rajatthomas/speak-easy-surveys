import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import ConversationPage from "./pages/ConversationPage";
import CompletionPage from "./pages/CompletionPage";
import PausedPage from "./pages/PausedPage";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import DashboardPage from "./pages/DashboardPage";
import GoalsPage from "./pages/GoalsPage";
import DISCProfilePage from "./pages/DISCProfilePage";
import SessionsPage from "./pages/SessionsPage";
import SettingsPage from "./pages/SettingsPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route 
                path="/conversation" 
                element={
                  <ProtectedRoute>
                    <ConversationPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/complete" 
                element={
                  <ProtectedRoute>
                    <CompletionPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/paused" 
                element={
                  <ProtectedRoute>
                    <PausedPage />
                  </ProtectedRoute>
                } 
              />
              {/* Dashboard with sidebar layout */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="goals" element={<GoalsPage />} />
                <Route path="profile" element={<DISCProfilePage />} />
                <Route path="sessions" element={<SessionsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              {/* Admin route - requires admin role */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
