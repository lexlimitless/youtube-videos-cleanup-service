import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ClerkProvider, SignIn, SignUp, RedirectToSignIn } from '@clerk/clerk-react';
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
          <Route path="/sign-in/*" element={<SignIn routing="path" path="/sign-in" />} />
          <Route path="/sign-up/*" element={<SignUp routing="path" path="/sign-up" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/" element={<RedirectToSignIn />} />
        </Routes>
      </Router>
    </ClerkProvider>
  );
}

export default App;