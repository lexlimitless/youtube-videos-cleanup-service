import React, { useState } from 'react';

const CodeBlock = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
  };

  return (
    <div className="relative">
      <pre className="bg-gray-800 text-white rounded-md p-4 pr-16 text-sm whitespace-pre-wrap break-all">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1 rounded"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
};

const CalendlyHelpGuide = () => {
  const [embedType, setEmbedType] = useState<'inline' | 'popup'>('inline');

  // --- Code for Inline Embed ---
  const inlineStep1 = `<script 
  type="text/javascript" 
  src="https://assets.calendly.com/assets/external/widget.js" 
  async
></script>`;

  const inlineStep2 = `<!-- If you already have this, just ensure it has id="calendly-embed" -->
<div 
  id="calendly-embed" 
  class="calendly-inline-widget" 
  data-url="https://calendly.com/YOUR_USER/YOUR_EVENT" 
  style="min-width:320px;height:700px;"
></div>`;

  const inlineStep3 = `
<script>
  // This script finds the 'ref' from the URL, saves it to a cookie,
  // and attaches it to your Calendly inline widget.
  try {
    const setCookie = (name, value, days) => {
      let expires = "";
      if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
      }
      document.cookie = name + "=" + (value || "") + expires + "; path=/";
    };

    const getCookie = (name) => {
      const nameEQ = name + "=";
      const ca = document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
      }
      return null;
    };

    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) {
      setCookie("mc_ref", ref, 1);
    }
    
    const refCookie = getCookie("mc_ref");
    if (refCookie) {
      const widget = document.getElementById("calendly-embed");
      if (widget) {
        const baseUrl = widget.getAttribute("data-url");
        if (!baseUrl.includes("ref=")) {
          widget.setAttribute("data-url", baseUrl + (baseUrl.includes("?") ? "&" : "?") + "ref=" + refCookie);
          if (window.Calendly) {
            window.Calendly.initInlineWidgets();
          }
        }
      }
    }
  } catch (e) {
    console.error("Calendly tracking script error:", e);
  }
</script>`;

  // --- Code for Popup Button ---
  const popupStep1 = `<script 
  type="text/javascript" 
  src="https://assets.calendly.com/assets/external/widget.js" 
  async
></script>`;

  const popupStep2 = `<!-- This button will trigger the Calendly popup. -->
<!-- You can style it or use your own, just ensure it has id="calendly-popup-button" -->
<button id="calendly-popup-button">Book a Call</button>`;
  
  const popupStep3 = `
<script>
  // This script finds the 'ref' from the URL, saves it to a cookie,
  // and uses it when the Calendly popup is opened.
  try {
    const setCookie = (name, value, days) => {
      let expires = "";
      if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
      }
      document.cookie = name + "=" + (value || "") + expires + "; path=/";
    };

    const getCookie = (name) => {
      const nameEQ = name + "=";
      const ca = document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
      }
      return null;
    };

    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) {
      setCookie("mc_ref", ref, 1);
    }

    const button = document.getElementById("calendly-popup-button");
    if (button) {
      button.addEventListener("click", () => {
        const refCookie = getCookie("mc_ref");
        Calendly.initPopupWidget({
          url: "https://calendly.com/YOUR_USER/YOUR_EVENT" + (refCookie ? "?ref=" + refCookie : "")
        });
      });
    }
  } catch (e) {
    console.error("Calendly tracking script error:", e);
  }
</script>\`;

  return (
    <div className="bg-white p-6 rounded-lg shadow-soft border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-2">How to Track Calls with Calendly</h2>
      <p className="text-gray-600 mb-6">To attribute bookings to your links, add a script to the page where your Calendly booking is.</p>
      
      {/* --- Toggle Switch --- */}
      <div className="flex justify-center bg-gray-100 rounded-lg p-1 mb-8 max-w-md mx-auto">
        <button 
          onClick={() => setEmbedType('inline')}
          className={`w-1/2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${embedType === 'inline' ? 'bg-white text-emerald-700 shadow' : 'bg-transparent text-gray-500'}`}
        >
          Inline Embed
        </button>
        <button 
          onClick={() => setEmbedType('popup')}
          className={`w-1/2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${embedType === 'popup' ? 'bg-white text-emerald-700 shadow' : 'bg-transparent text-gray-500'}`}
        >
          Popup Button
        </button>
      </div>

      {embedType === 'inline' ? (
        // --- Instructions for Inline Embed ---
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Step 1: Add Calendly's Main Script</h3>
            <p className="text-gray-600 mb-3">Ensure this script tag is in the `head` section of your website. Skip if it's already there.</p>
            <CodeBlock code={inlineStep1} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Step 2: Identify Your Calendly Embed</h3>
            <p className="text-gray-600 mb-3">Locate your Calendly embed `div`. The most important part is adding <span className="font-mono bg-gray-100 px-1 rounded">id="calendly-embed"</span> so our script can find it.</p>
            <CodeBlock code={inlineStep2} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Step 3: Add the Tracking Script</h3>
            <p className="text-gray-600 mb-3">Paste this script just before the closing `body` tag on your page. Remember to replace `YOUR_USER/YOUR_EVENT` in Step 2 with your actual Calendly link.</p>
            <CodeBlock code={inlineStep3} />
          </div>
        </div>
      ) : (
        // --- Instructions for Popup Button ---
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Step 1: Add Calendly's Main Script</h3>
            <p className="text-gray-600 mb-3">Ensure this script tag is in the `head` section of your website. Skip if it's already there.</p>
            <CodeBlock code={popupStep1} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Step 2: Add a Booking Button</h3>
            <p className="text-gray-600 mb-3">Place this button where you want the booking trigger to be. The most important part is the <span className="font-mono bg-gray-100 px-1 rounded">id="calendly-popup-button"</span>.</p>
            <CodeBlock code={popupStep2} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Step 3: Add the Tracking Script</h3>
            <p className="text-gray-600 mb-3">Paste this script just before the closing `body` tag. Remember to replace `YOUR_USER/YOUR_EVENT` inside this script with your actual Calendly link.</p>
            <CodeBlock code={popupStep3} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendlyHelpGuide; 