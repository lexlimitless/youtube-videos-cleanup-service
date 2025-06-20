import './envtest';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignIn, SignUp, SignedIn, SignedOut } from '@clerk/clerk-react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TrackableLinks from './pages/TrackableLinks.tsx';
import Redirect from './pages/redirect/[shortCode]';
import Integrations from './pages/Integrations.tsx';
import QRCodeGenerator from './pages/QRCodeGenerator.tsx';
import CalendlyCallback from './pages/CalendlyCallback.tsx';

// Debug environment variables
// console.log('Environment variables:', {
//   clerkKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ? 'Present' : 'Missing',
//   supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'Present' : 'Missing',
//   supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing'
// });

if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
  console.error('Missing Clerk Publishable Key');
  throw new Error('Missing Clerk Publishable Key');
}

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// The main App component serves as the root of our application
// It renders the QRCodeGenerator component within a full-height container
// with a light beige background color (#fbf6f0)
export default function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <SignedIn>
                  <Navigate to="/dashboard" replace />
                </SignedIn>
                <SignedOut>
                  <Navigate to="/sign-in" replace />
                </SignedOut>
              </>
            }
          />
          <Route
            path="/sign-in/*"
            element={
              <SignedOut>
                <SignIn routing="path" path="/sign-in" />
              </SignedOut>
            }
          />
          <Route
            path="/sign-up/*"
            element={
              <SignedOut>
                <SignUp routing="path" path="/sign-up" />
              </SignedOut>
            }
          />
          <Route
            path="/"
            element={
              <SignedIn>
                <Layout />
              </SignedIn>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="qr-codes" element={<div>QR Codes</div>} />
            <Route path="links" element={<TrackableLinks />} />
            <Route path="attribution" element={<div>Attribution Settings</div>} />
            <Route path="integrations" element={<Integrations />} />
            <Route path="integrations/calendly-callback" element={<CalendlyCallback />} />
            <Route path="settings" element={<div>Account Settings</div>} />
          </Route>
          {/* Public redirect route */}
          <Route path="/:shortCode" element={<Redirect />} />
        </Routes>
      </Router>
    </ClerkProvider>
  );
}