import { useSelector } from 'react-redux';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import { selectCurrentUser } from './features/auth/authSlice';
import AssignmentSubmissions from './pages/AssignmentSubmissions';
import AssignmentUpload from './pages/AssignmentUpload';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Signup from './pages/Signup';

// Layout wrapper to include Navbar everywhere
const Layout = () => {
    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <Navbar />
            <Outlet />
        </div>
    );
};

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const user = useSelector(selectCurrentUser);
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

// Public Route Wrapper (Redirects to dashboard if already logged in)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    const user = useSelector(selectCurrentUser);
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }
    return children;
};

function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                {/* Public Routes */}
                <Route path="/" element={<Onboarding />} />
                <Route
                    path="/login"
                    element={
                        <PublicRoute>
                            <Login />
                        </PublicRoute>
                    }
                />
                <Route
                    path="/signup"
                    element={
                        <PublicRoute>
                            <Signup />
                        </PublicRoute>
                    }
                />

                {/* Protected Routes */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/assignment/:assignmentId/submissions"
                    element={
                        <ProtectedRoute>
                            <AssignmentSubmissions />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/upload/:assignmentId"
                    element={
                        <ProtectedRoute>
                            <AssignmentUpload />
                        </ProtectedRoute>
                    }
                />
            </Route>
        </Routes>
    );
}

export default App;
