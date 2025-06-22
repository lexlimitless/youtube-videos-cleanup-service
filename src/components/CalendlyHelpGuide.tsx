import { useState, useEffect } from 'react';

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
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) {
      const widget = document.querySelector('.calendly-inline-widget');
      if (widget) {
        const baseUrl = widget.getAttribute('data-url');
        if (baseUrl && !baseUrl.includes('utm_content=')) {
          const newUrl = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'utm_content=' + ref;
          widget.setAttribute('data-url', newUrl);
        }
      }
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

  useEffect(() => {
    // This script is designed to be robust and not block page rendering.
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');

      if (ref) {
        const observer = new MutationObserver((mutationsList, observer) => {
          for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
              const calendlyWidgets = document.querySelectorAll('.calendly-inline-widget');
              calendlyWidgets.forEach(widget => {
                const widgetUrl = widget.getAttribute('data-url');
                if (widgetUrl) {
                  const url = new URL(widgetUrl);
                  if (!url.searchParams.has('utm_content')) {
                    url.searchParams.set('utm_content', ref);
                    const newUrl = url.toString();
                    widget.setAttribute('data-url', newUrl);
                    // To force a reload of the iframe with the new URL
                    widget.innerHTML = ''; 
                    const iframe = document.createElement('iframe');
                    iframe.src = newUrl;
                    iframe.frameBorder = '0';
                    iframe.style.width = '100%';
                    iframe.style.height = '100%';
                    widget.appendChild(iframe);
                  }
                }
              });
            }
          }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Cleanup observer on component unmount
        return () => observer.disconnect();
      }
    } catch (error) {
      // Don't log errors to the console in production
    }
  }, []);

  return (
    <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Track Your Existing Calendly Embed</h2>
       <p className="mb-2 text-gray-600">
        This new script uses a more reliable method to track bookings directly from the browser, bypassing Calendly's webhooks.
      </p>
      <p className="mb-6 text-gray-500 text-sm">
        It works with your **pre-existing** Calendly embed by listening for the booking confirmation event.
      </p>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Instructions</h3>
        <ol className="list-decimal list-inside space-y-4 text-gray-600">
          <li>
            On your external website, you should already have the code provided by Calendly to embed your booking page. It typically looks like this:
            <CodeBlock language="html" code={`<!-- Calendly inline widget begin -->\n<div class="calendly-inline-widget" data-url="https://calendly.com/your-event/..."></div>\n<script type="text/javascript" src="https://assets.calendly.com/assets/external/widget.js" async></script>\n<!-- Calendly inline widget end -->`} />
          </li>
          <li>
            Copy the tracking script below and paste it into your page's HTML. This script will find your Calendly widget and add the necessary tracking parameter. The best place for it is just before the closing <code className="font-mono bg-gray-200 px-1 rounded-sm">&lt;/body&gt;</code> tag.
          </li>
        </ol>
        
        <div className="mt-6">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">New Tracking Script</h3>
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