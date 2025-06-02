import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { session } = useAuth();
  
  return session ? <>{children}</> : <Navigate to="/login" />;
};

export default PrivateRoute;