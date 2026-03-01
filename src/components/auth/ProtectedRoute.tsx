import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import AuthService from '../../api/services/auth.service';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const location = useLocation();
    const isAuthenticated = AuthService.isAuthenticated();
    const userRole = AuthService.getUserRole();

    if (!isAuthenticated) {
        // Redirect to login page but save the current location they were trying to go to
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
        // Role not authorized, redirect to their default dashboard or login
        if (userRole === 'school') return <Navigate to="/school/dashboard" replace />;
        if (userRole === 'state') return <Navigate to="/state/dashboard" replace />;
        if (userRole === 'hq' || userRole === 'admin') return <Navigate to="/head-office/dashboard" replace />;
        if (userRole === 'viewer') return <Navigate to="/viewer/dashboard" replace />;
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
