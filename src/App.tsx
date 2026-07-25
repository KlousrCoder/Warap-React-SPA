import { Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { AppRoutes } from "@/routes";
import { NotificationsListener } from "@/components/NotificationsListener";
import { Toaster } from "@/components/ui/sonner";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen bg-background text-foreground">
          <NotificationsListener />
          <AppRoutes />
          <Routes>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" richColors closeButton />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}
