import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Protected Route wrapper component
 * Redirects to login if user is not authenticated
 */
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#030308]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
