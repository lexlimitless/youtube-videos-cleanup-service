import React, { useState, useEffect, useRef } from 'react';
// QRCodeSVG is a React component that generates QR codes
import { QRCodeSVG } from 'qrcode.react';
// Lucide React provides modern, customizable icons
import { Plus, Pencil, Trash2, QrCode, Download } from 'lucide-react';
// React-hot-toast provides elegant notifications
import toast from 'react-hot-toast';

// TypeScript interface defining the structure of a QR code entry
interface QRCode {
  id: string;        // Unique identifier
  name: string;      // User-given name for the QR code
  url: string;       // The URL that the QR code points to
  created_at: string; // Timestamp of creation
}

const QRCodeGenerator = () => {
  // State management using React hooks
  // useState preserves values between renders
  
  // Stores the list of QR codes, initialized from localStorage if available
  const [qrCodes, setQrCodes] = useState<QRCode[]>(() => {
    const saved = localStorage.getItem('qrCodes');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Controls the visibility of the create/edit modal
  const [showModal, setShowModal] = useState(false);
  // Stores the name input value
  const [name, setName] = useState('');
  // Stores the URL input value
  const [url, setUrl] = useState('');
  // Tracks which QR code is being edited (null when creating new)
  const [editingId, setEditingId] = useState<string | null>(null);

  // useEffect hook runs side effects in functional components
  // This effect saves QR codes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('qrCodes', JSON.stringify(qrCodes));
  }, [qrCodes]); // The effect runs when qrCodes changes

  // Function to download QR code as PNG
  const downloadQRCode = (qrCodeUrl: string, qrCodeName: string) => {
    // Create a temporary canvas element
    const canvas = document.createElement('canvas');
    const svg = document.querySelector(`[data-url="${qrCodeUrl}"]`);
    
    if (!svg) {
      toast.error('Could not generate QR code image');
      return;
    }

    // Get the SVG data
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Create an image from the SVG
    const img = new Image();
    img.onload = () => {
      // Set canvas dimensions
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw image to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        toast.error('Could not generate QR code image');
        return;
      }
      
      ctx.drawImage(img, 0, 0);

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Could not generate QR code image');
          return;
        }

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${qrCodeName}-qr-code.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.src = svgUrl;
  };

  // Handles form submission for creating/editing QR codes
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Prevents the default form submission behavior
    
    try {
      if (editingId) {
        // Update existing QR code
        setQrCodes(qrCodes.map(code => 
          code.id === editingId 
            ? { ...code, name, url } 
            : code
        ));
        toast.success('QR code updated successfully');
      } else {
        // Create new QR code
        const newQRCode = {
          id: crypto.randomUUID(), // Generate unique ID
          name,
          url,
          created_at: new Date().toISOString()
        };
        setQrCodes([newQRCode, ...qrCodes]); // Add to beginning of list
        toast.success('QR code created successfully');
      }

      // Reset form and close modal
      setShowModal(false);
      setName('');
      setUrl('');
      setEditingId(null);
    } catch (error: any) {
      toast.error('An error occurred');
    }
  };

  // Prepares the form for editing an existing QR code
  const handleEdit = (qrCode: QRCode) => {
    setEditingId(qrCode.id);
    setName(qrCode.name);
    setUrl(qrCode.url);
    setShowModal(true);
  };

  // Deletes a QR code
  const handleDelete = (id: string) => {
    try {
      setQrCodes(qrCodes.filter(code => code.id !== id));
      toast.success('QR code deleted successfully');
    } catch (error: any) {
      toast.error('An error occurred');
    }
  };

  // The component's UI structure using JSX and Tailwind CSS
  return (
    <div className="min-h-screen bg-[#fbf6f0] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header section with title and create button */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <QrCode size={32} className="text-[#15342b]" />
            <h1 className="text-3xl font-bold text-[#15342b]">QR Code Generator</h1>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setName('');
              setUrl('');
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-[#15342b] text-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors"
          >
            <Plus size={20} /> New QR Code
          </button>
        </div>

        {/* Grid of QR codes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {qrCodes.map((qrCode) => (
            <div key={qrCode.id} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-[#15342b]">{qrCode.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadQRCode(qrCode.url, qrCode.name)}
                    className="text-gray-600 hover:text-[#15342b]"
                    title="Download QR Code"
                  >
                    <Download size={20} />
                  </button>
                  <button
                    onClick={() => handleEdit(qrCode)}
                    className="text-gray-600 hover:text-[#15342b]"
                    title="Edit"
                  >
                    <Pencil size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(qrCode.id)}
                    className="text-gray-600 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              <div className="flex justify-center mb-4">
                <QRCodeSVG 
                  value={qrCode.url} 
                  size={200}
                  data-url={qrCode.url} // Added for download functionality
                />
              </div>
              <a
                href={qrCode.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:text-[#15342b] break-all"
              >
                {qrCode.url}
              </a>
            </div>
          ))}
        </div>

        {/* Modal for creating/editing QR codes */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold text-[#15342b] mb-4">
                {editingId ? 'Edit QR Code' : 'Create New QR Code'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#15342b] focus:ring focus:ring-[#15342b] focus:ring-opacity-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">URL</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#15342b] focus:ring focus:ring-[#15342b] focus:ring-opacity-50"
                    required
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 bg-[#15342b] text-white py-2 px-4 rounded-md hover:bg-opacity-90 transition-colors"
                  >
                    {editingId ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRCodeGenerator;