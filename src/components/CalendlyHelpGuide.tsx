import { useState } from 'react';

const CodeBlock = ({ code, language }: { code: string, language?: string }) => {
  return (
    <div className="relative my-4">
      <pre className="bg-gray-800 text-white rounded-md p-4 text-sm whitespace-pre-wrap break-all">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
};

const CalendlyHelpGuide = () => {
  const [copied, setCopied] = useState(false);

  const trackingScript = `<!-- QR-Generator Tracking Script for Calendly -->
<script>
  try {
    console.log("QR-Generator: Calendly tracking script initializing.");
    const ref = new URLSearchParams(window.location.search).get("ref");

    if (ref) {
      console.log("QR-Generator: Found tracking ref:", ref);
      // Find the standard Calendly inline widget on your page.
      const widget = document.querySelector('.calendly-inline-widget');

      if (widget) {
        const baseUrl = widget.getAttribute('data-url');
        
        // Only add the 'ref' if the URL exists and doesn't already have one.
        if (baseUrl && !baseUrl.includes('ref=')) {
          // Add the ref parameter correctly, handling existing query params.
          const newUrl = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'ref=' + ref;
          widget.setAttribute('data-url', newUrl);
          
          console.log('QR-Generator: Successfully added ref. New Calendly URL:', newUrl);
        } else if (baseUrl) {
          console.log("QR-Generator: A 'ref' parameter already exists on the widget. No changes made.");
        }
      } else {
        console.warn('QR-Generator: Could not find a Calendly widget with class ".calendly-inline-widget" to attach tracking to.');
      }
    } else {
      console.log("QR-Generator: No 'ref' parameter in URL. No tracking will be applied.");
    }
  } catch (e) {
    console.error("QR-Generator: Calendly tracking script fatal error:", e);
  }
</script>`;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Track Your Existing Calendly Embed</h2>
      <p className="mb-6 text-gray-600">
        This script works with your **pre-existing** Calendly embed. It finds the tracking <code className="font-mono bg-gray-200 px-1 rounded-sm">ref</code> from the page URL and attaches it to your widget.
      </p>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Instructions</h3>
        <ol className="list-decimal list-inside space-y-4 text-gray-600">
          <li>
            On your external website, you should already have the code provided by Calendly to embed your booking page. It typically looks like this:
            <CodeBlock language="html" code={`<!-- Calendly inline widget begin -->\n<div class="calendly-inline-widget" data-url="https://calendly.com/your-event/..."></div>\n<script type="text/javascript" src="https://assets.calendly.com/assets/external/widget.js" async></script>\n<!-- Calendly inline widget end -->`} />
          </li>
          <li>
            Copy the tracking script below and paste it into your page's HTML. **The best place to paste it is just before the closing <code className="font-mono bg-gray-200 px-1 rounded-sm">&lt;/body&gt;</code> tag.**
          </li>
        </ol>
        
        <div className="mt-6">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Tracking Script</h3>
          <div className="bg-gray-900 text-white p-4 rounded-md relative">
            <button
              onClick={() => handleCopy(trackingScript)}
              className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-1 px-3 rounded-md text-sm"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <pre className="overflow-x-auto"><code>{trackingScript}</code></pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendlyHelpGuide; 