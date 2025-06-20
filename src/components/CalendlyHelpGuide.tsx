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
  const [activeTab, setActiveTab] = useState('inline');
  const [copied, setCopied] = useState(false);

  // This is the single, complete code block for the user to copy.
  // It includes the debugging console logs.
  const inlineEmbedCode = `<!-- Calendly inline widget begin -->
<div id="calendly-embed" style="min-width:320px;height:700px;"></div>
<script type="text/javascript" src="https://assets.calendly.com/assets/external/widget.js" async></script>
<script>
  console.log("--- Calendly Embed Script Initialized ---");
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    console.log("Extracted 'ref' parameter:", ref);

    // IMPORTANT: Replace with your actual Calendly link below
    const calendlyBaseUrl = "https://calendly.com/YOUR_USERNAME/YOUR_EVENT_TYPE";

    let finalUrl = calendlyBaseUrl;
    if (ref) {
      finalUrl = calendlyBaseUrl + "?ref=" + ref;
      console.log("Constructed Calendly URL with ref:", finalUrl);
    } else {
      console.warn("Calendly Embed Script: 'ref' parameter not found in the URL. Widget will not be personalized for tracking.");
    }

    window.onload = function() {
      console.log("Window loaded, initializing Calendly widget.");
      Calendly.initInlineWidget({
        url: finalUrl,
        parentElement: document.getElementById('calendly-embed'),
        prefill: {},
        utm: {}
      });
      console.log("Calendly.initInlineWidget function called for URL:", finalUrl);
    }
  } catch (e) {
    console.error("--- Calendly Embed Script FATAL ERROR ---", e);
  }
</script>
<!-- Calendly inline widget end -->`;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Calendly Integration Guide</h2>
      <p className="mb-6 text-gray-600">
        To track bookings, you need to add a small script to your external booking page. This script finds the unique <code className="font-mono bg-gray-200 px-1 rounded-sm">ref</code> code from the URL and attaches it to your Calendly booking link.
      </p>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Instructions</h3>
        <ol className="list-decimal list-inside space-y-3 text-gray-600">
          <li>
            On your external site editor (like systeme.io, Webflow, etc.), add a "Raw HTML" or "Custom Code" block to your booking page.
          </li>
          <li>
            Copy the complete code block below and paste it into the Raw HTML block.
          </li>
          <li>
            **Crucially**, update the <code className="font-mono bg-gray-200 px-1 rounded-sm">YOUR_USERNAME/YOUR_EVENT_TYPE</code> part of the script to your actual Calendly event link.
          </li>
        </ol>
        
        <div className="mt-6">
          <div className="bg-gray-900 text-white p-4 rounded-md relative">
            <button
              onClick={() => handleCopy(inlineEmbedCode)}
              className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-1 px-3 rounded-md text-sm"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <pre className="overflow-x-auto"><code>{inlineEmbedCode}</code></pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendlyHelpGuide; 