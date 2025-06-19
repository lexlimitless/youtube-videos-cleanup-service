import React, { useState } from 'react';

const scriptCode = `<script>
  // Store ref from URL to cookie
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref) {
    document.cookie = \`ref=\${ref}; max-age=\${60 * 60 * 24 * 30}; path=/\`;
  }

  // Launch Calendly with ref
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  const calendlyButton = document.getElementById("book-call");
  const refCookie = getCookie("ref");

  calendlyButton?.addEventListener("click", function () {
    Calendly.initPopupWidget({
      url: \`https://calendly.com/YOUR-SLUG?ref=\${refCookie || "unknown"}\`
    });
  });
</script>`;

const buttonCode = `<button id="book-call">Book a Call</button>`;

const embeddedWidgetCode = `<script>
  // Store ref from URL to cookie
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref) {
    document.cookie = \`ref=\${ref}; max-age=\${60 * 60 * 24 * 30}; path=/\`;
  }

  // Get the ref from cookie for embedded widget
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  const refCookie = getCookie("ref");
  
  // Initialize Calendly embedded widget with ref
  Calendly.initInlineWidget({
    url: \`https://calendly.com/YOUR-SLUG?ref=\${refCookie || "unknown"}\`,
    parentElement: document.getElementById('calendly-inline-widget'),
    prefill: {},
    utm: {}
  });
</script>`;

const embeddedWidgetHtml = `<div id="calendly-inline-widget" style="min-width:320px;height:700px;"></div>`;

export default function CalendlyHelpGuide() {
  const [copied, setCopied] = useState(false);
  const [copiedBtn, setCopiedBtn] = useState(false);
  const [copiedEmbedded, setCopiedEmbedded] = useState(false);
  const [copiedEmbeddedHtml, setCopiedEmbeddedHtml] = useState(false);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleCopyBtn = () => {
    navigator.clipboard.writeText(buttonCode);
    setCopiedBtn(true);
    setTimeout(() => setCopiedBtn(false), 2000);
  };

  const handleCopyEmbedded = () => {
    navigator.clipboard.writeText(embeddedWidgetCode);
    setCopiedEmbedded(true);
    setTimeout(() => setCopiedEmbedded(false), 2000);
  };

  const handleCopyEmbeddedHtml = () => {
    navigator.clipboard.writeText(embeddedWidgetHtml);
    setCopiedEmbeddedHtml(true);
    setTimeout(() => setCopiedEmbeddedHtml(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6 mt-8 border border-gray-100">
      <h2 className="text-xl font-bold mb-4">📘 How to Track Your Calendly Bookings</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Choose Your Implementation Method:</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">🎯 Method 1: Popup Widget (Recommended)</h4>
            <p className="text-sm text-blue-700">Use a button that opens Calendly in a popup. Best for most landing pages.</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2">📱 Method 2: Embedded Widget</h4>
            <p className="text-sm text-green-700">Embed Calendly directly on your page. Great for dedicated booking pages.</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Method 1: Popup Widget */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-800">🎯 Method 1: Popup Widget</h3>
          <ol className="list-decimal pl-6 mb-6 text-gray-700 space-y-4">
            <li>
              <strong>Paste This Script on Your Landing Page:</strong>
              <div className="relative mt-2">
                <textarea
                  className="w-full font-mono text-xs bg-gray-50 border border-gray-200 rounded p-2 mb-2 resize-none"
                  rows={scriptCode.split('\n').length}
                  value={scriptCode}
                  readOnly
                />
                <button
                  className="absolute top-2 right-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1 rounded"
                  onClick={handleCopyScript}
                >
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                <strong>Note:</strong> Replace <code>YOUR-SLUG</code> with your actual Calendly URL (e.g., <code>yourname/30min</code>)
              </div>
            </li>
            <li>
              <strong>Add This Button to Your Page:</strong>
              <div className="relative mt-2">
                <textarea
                  className="w-full font-mono text-xs bg-gray-50 border border-gray-200 rounded p-2 mb-2 resize-none"
                  rows={buttonCode.split('\n').length}
                  value={buttonCode}
                  readOnly
                />
                <button
                  className="absolute top-2 right-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1 rounded"
                  onClick={handleCopyBtn}
                >
                  {copiedBtn ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                <strong>What this does:</strong> This button will trigger the Calendly popup when clicked. You can style it however you want or use your existing button - just make sure it has <code>id="book-call"</code>.
              </div>
            </li>
            <li>
              <strong>Done!</strong> Now when someone clicks your button, Calendly will open in a popup and track which link brought them there.
            </li>
          </ol>
        </div>

        {/* Method 2: Embedded Widget */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-800">📱 Method 2: Embedded Widget</h3>
          <ol className="list-decimal pl-6 mb-6 text-gray-700 space-y-4">
            <li>
              <strong>Add This HTML Container to Your Page:</strong>
              <div className="relative mt-2">
                <textarea
                  className="w-full font-mono text-xs bg-gray-50 border border-gray-200 rounded p-2 mb-2 resize-none"
                  rows={embeddedWidgetHtml.split('\n').length}
                  value={embeddedWidgetHtml}
                  readOnly
                />
                <button
                  className="absolute top-2 right-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1 rounded"
                  onClick={handleCopyEmbeddedHtml}
                >
                  {copiedEmbeddedHtml ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                <strong>What this does:</strong> This creates a container where the Calendly widget will be embedded. Place it wherever you want the calendar to appear on your page.
              </div>
            </li>
            <li>
              <strong>Add This Script to Initialize the Widget:</strong>
              <div className="relative mt-2">
                <textarea
                  className="w-full font-mono text-xs bg-gray-50 border border-gray-200 rounded p-2 mb-2 resize-none"
                  rows={embeddedWidgetCode.split('\n').length}
                  value={embeddedWidgetCode}
                  readOnly
                />
                <button
                  className="absolute top-2 right-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1 rounded"
                  onClick={handleCopyEmbedded}
                >
                  {copiedEmbedded ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                <strong>Note:</strong> Replace <code>YOUR-SLUG</code> with your actual Calendly URL (e.g., <code>yourname/30min</code>)
              </div>
            </li>
            <li>
              <strong>Done!</strong> The Calendly widget will now be embedded directly on your page and track which link brought visitors there.
            </li>
          </ol>
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-semibold text-yellow-800 mb-2">💡 How It Works:</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• When someone visits your page with a <code>?ref=YOUR_SHORT_CODE</code> parameter, it gets stored in a cookie</li>
          <li>• When they book through Calendly, the ref is automatically added to the booking URL</li>
          <li>• Your dashboard will show which link, video, or post led to each booking</li>
          <li>• You can track performance across different marketing channels</li>
        </ul>
      </div>
    </div>
  );
} 