import React from 'react';

const CodeBlock = ({ code }: { code: string }) => (
  <pre className="bg-gray-800 text-white rounded-md p-4 overflow-x-auto text-sm">
    <code>{code}</code>
  </pre>
);

const CalendlyHelpGuide = () => {
  const step1Code = `<script 
  type="text/javascript" 
  src="https://assets.calendly.com/assets/external/widget.js" 
  async
></script>`;

  const step2Code = `<!-- 
  This is your Calendly embed code. 
  If you already have this on your page, just ensure it has the id="calendly-embed".
-->
<div 
  id="calendly-embed" 
  class="calendly-inline-widget" 
  data-url="https://calendly.com/YOUR_USER/YOUR_EVENT" 
  style="min-width:320px;height:700px;"
></div>`;

  const step3Code = `<script>
  try {
    // Function to set a cookie
    const setCookie = (name, value, days) => {
      let expires = "";
      if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
      }
      document.cookie = name + "=" + (value || "")  + expires + "; path=/";
    };

    // Function to get a cookie
    const getCookie = (name) => {
      const nameEQ = name + "=";
      const ca = document.cookie.split(';');
      for(let i=0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
      }
      return null;
    };

    // 1. Check URL for a 'ref' parameter and save it to a cookie
    const params = new URLSearchParams(window.location.search);
    const refFromUrl = params.get('ref');
    if (refFromUrl) {
      setCookie('mc_ref', refFromUrl, 1); // Save ref in a cookie for 1 day
    }

    // 2. Check for the 'ref' cookie
    const refFromCookie = getCookie('mc_ref');

    if (refFromCookie) {
      // 3. Find the Calendly widget on your page
      const widget = document.getElementById('calendly-embed');
      if (widget) {
        const baseUrl = widget.getAttribute('data-url');
        // Prevent adding the ref parameter multiple times
        if (!baseUrl.includes('ref=')) {
          const newUrl = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'ref=' + refFromCookie;
          widget.setAttribute('data-url', newUrl);

          // If Calendly's script has already run, re-initialize the widget
          if (window.Calendly) {
            window.Calendly.initInlineWidgets();
          }
        }
      }
    }
  } catch (e) {
    console.error("Error setting up Calendly tracking ref:", e);
  }
</script>`;

  return (
    <div className="bg-white p-6 rounded-lg shadow-soft border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-4">How to Track Calls with Calendly</h2>
      <p className="text-gray-600 mb-6">
        To attribute bookings to your trackable links, you need to add a small script to the webpage where your Calendly booking widget is embedded. This guide will walk you through it.
      </p>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Step 1: Add the Calendly Widget Script</h3>
          <p className="text-gray-600 mb-3">
            First, ensure Calendly's main JavaScript file is included on your page. If it's already there, you can skip this. Place this code in the `<head>` section of your website's HTML.
          </p>
          <CodeBlock code={step1Code} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Step 2: Identify Your Calendly Embed</h3>
          <p className="text-gray-600 mb-3">
            Next, locate your Calendly embed code. If you don't have one, you can use the example below.
            <span className="font-bold"> The most important part is ensuring your embed `div` has the `id="calendly-embed"` attribute.</span> Our tracking script uses this ID to find the widget.
          </p>
          <CodeBlock code={step2Code} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Step 3: Add the Tracking Script</h3>
          <p className="text-gray-600 mb-3">
            Finally, copy and paste this script tag just before the closing `</body>` tag on your webpage. This script automatically finds the `ref` ID from the URL, saves it to a cookie, and attaches it to your Calendly widget for tracking.
          </p>
          <CodeBlock code={step3Code} />
        </div>
      </div>
    </div>
  );
};

export default CalendlyHelpGuide; 