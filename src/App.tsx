import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignIn, SignUp, SignedIn, SignedOut } from '@clerk/clerk-react';
import Dashboard from './pages/Dashboard';

// Debug environment variables
console.log('Environment variables:', {
  clerkKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ? 'Present' : 'Missing',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'Present' : 'Missing',
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing'
});

if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
  console.error('Missing Clerk Publishable Key');
  throw new Error('Missing Clerk Publishable Key');
}

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// The main App component serves as the root of our application
// It renders the QRCodeGenerator component within a full-height container
// with a light beige background color (#fbf6f0)
function App() {
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
            path="/dashboard"
            element={
              <SignedIn>
                <Dashboard />
              </SignedIn>
            }
          />
        </Routes>
      </Router>
    </ClerkProvider>
  );
}

export default App;