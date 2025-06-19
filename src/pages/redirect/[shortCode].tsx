import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function Redirect() {
  const { shortCode } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    async function handleRedirect() {
      if (!shortCode) {
        navigate('/');
        return;
      }

      try {
        // Get link details
        const { data: link, error: linkError } = await supabase
          .from('links')
          .select('destination_url')
          .eq('short_code', shortCode)
          .single();

        if (linkError || !link) {
          navigate('/');
          return;
        }

        // Record click
        await supabase
          .from('clicks')
          .insert([{
            short_code: shortCode,
            ip_address: await getIpAddress(),
            user_agent: navigator.userAgent,
            referrer: document.referrer,
            location: await getLocation(),
            session_id: getSessionId(),
          }]);

        // Append ref=shortCode to the destination URL
        const base = new URL(link.destination_url, window.location.origin);
        base.searchParams.set('ref', shortCode);
        // Redirect to the updated URL
        window.location.href = base.toString();
      } catch (error) {
        navigate('/');
      }
    }

    handleRedirect();
  }, [shortCode, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
    </div>
  );
}

// Helper functions
async function getIpAddress(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
}

async function getLocation(): Promise<string> {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return `${data.city}, ${data.country_name}`;
  } catch {
    return 'unknown';
  }
}

function getSessionId(): string {
  let sessionId = sessionStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2);
    sessionStorage.setItem('session_id', sessionId);
  }
  return sessionId;
} 