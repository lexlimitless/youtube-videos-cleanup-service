import React from 'react';
import QRCodeGenerator from './pages/QRCodeGenerator';

// The main App component serves as the root of our application
// It renders the QRCodeGenerator component within a full-height container
// with a light beige background color (#fbf6f0)
function App() {
  return (
    <div className="min-h-screen bg-[#fbf6f0]">
      <QRCodeGenerator />
    </div>
  );
}

export default App;