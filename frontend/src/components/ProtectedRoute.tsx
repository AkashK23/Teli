import React from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "../UserContext";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { userId, loadingUser } = useUser();

  if (loadingUser) {
    return <div>Loading...</div>; // spinner/placeholder
  }

  if (!userId) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
