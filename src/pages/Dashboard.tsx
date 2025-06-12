import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Pencil, Trash2, LogOut, Download, BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// Debug logging
console.log('Environment Variables:', {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'Present' : 'Missing',
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing'
});

console.log('Supabase Client:', supabase);

interface QRCode {
  id: string;
  name: string;
  url: string;
  original_url: string;
  redirect_id: string;
  click_count: number;
  last_clicked: string;
  created_at: string;
  clerk_user_id: string;
}

interface QRCodeClick {
  clicked_at: string;
  ip_address: string;
  user_agent: string;
  country?: string;
  city?: string;
}

const Dashboard = () => {
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedQRCode, setSelectedQRCode] = useState<QRCode | null>(null);
  const [clicks, setClicks] = useState<QRCodeClick[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    fetchQRCodes();
  }, []);

  const fetchQRCodes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('clerk_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error.message);
        throw error;
      }

      setQrCodes(data || []);
    } catch (error: any) {
      let errorMessage = 'Error fetching QR codes';
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        errorMessage = 'Unable to connect to the database. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast.error(errorMessage);
      console.error('Error fetching QR codes:', error);
    }
  };

  const fetchQRCodeClicks = async (qrCode: QRCode) => {
    try {
      const { data, error } = await supabase
        .from('qr_code_clicks')
        .select('*')
        .eq('qr_code_id', qrCode.id)
        .order('clicked_at', { ascending: false });

      if (error) throw error;
      setClicks(data || []);
      setSelectedQRCode(qrCode);
      setShowStatsModal(true);
    } catch (error: any) {
      toast.error('Error fetching click statistics');
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingId) {
        // Get the current QR code being edited
        const currentQRCode = qrCodes.find(code => code.id === editingId);
        if (!currentQRCode) {
          throw new Error('QR code not found');
        }

        const { error } = await supabase
          .from('qr_codes')
          .update({ 
            name,
            original_url: url,
            url: `${window.location.origin}/redirect/${currentQRCode.redirect_id}`
          })
          .eq('id', editingId)
          .eq('clerk_user_id', user.id);

        if (error) throw error;
        toast.success('QR code updated successfully');
      } else {
        // For new QR codes, first create with temporary URL
        const { data: newQRCode, error: insertError } = await supabase
          .from('qr_codes')
          .insert([{
            name,
            original_url: url,
            url: url, // Temporary URL, will be updated after we get the ID
            clerk_user_id: user.id
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        if (!newQRCode) throw new Error('Failed to create QR code');

        // Update with the redirect URL
        const { error: updateError } = await supabase
          .from('qr_codes')
          .update({
            url: `${window.location.origin}/redirect/${newQRCode.redirect_id}`
          })
          .eq('id', newQRCode.id)
          .eq('clerk_user_id', user.id);

        if (updateError) throw updateError;
        toast.success('QR code created successfully');
      }

      setShowModal(false);
      setName('');
      setUrl('');
      setEditingId(null);
      fetchQRCodes();
    } catch (error: any) {
      toast.error(error.message);
      console.error('Error:', error);
    }
  };

  const handleEdit = (qrCode: QRCode) => {
    setEditingId(qrCode.id);
    setName(qrCode.name);
    setUrl(qrCode.url);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('qr_codes')
        .delete()
        .eq('id', id)
        .eq('clerk_user_id', user.id);

      if (error) throw error;
      toast.success('QR code deleted successfully');
      fetchQRCodes();
    } catch (error: any) {
      toast.error(error.message);
      console.error('Error:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/sign-in');
  };

  const handleDownload = async (qrCode: QRCode) => {
    try {
      // Create a temporary container for the SVG
      const container = document.createElement('div');
      container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        ${document.getElementById(`qr-${qrCode.id}`)?.innerHTML || ''}
      </svg>`;
      
      const svgElement = container.firstChild as SVGElement;
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      
      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      // Create image from SVG
      const img = new Image();
      img.src = svgUrl;
      
      await new Promise((resolve) => {
        img.onload = () => {
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          URL.revokeObjectURL(svgUrl);
          resolve(null);
        };
      });
      
      // Convert canvas to PNG and download
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `${qrCode.name}-qr-code.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      toast.success('QR code downloaded successfully');
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast.error('Failed to download QR code');
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf6f0] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#15342b]">QR Code Generator</h1>
          <div className="flex gap-4">
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
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
            >
              <LogOut size={20} /> Sign Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {qrCodes.map((qrCode) => (
            <div key={qrCode.id} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-[#15342b]">{qrCode.name}</h3>
                  <p className="text-sm text-gray-500">
                    {qrCode.click_count} clicks
                    {qrCode.last_clicked && ` • Last clicked ${new Date(qrCode.last_clicked).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchQRCodeClicks(qrCode)}
                    className="text-gray-600 hover:text-[#15342b]"
                    title="View Statistics"
                  >
                    <BarChart2 size={20} />
                  </button>
                  <button
                    onClick={() => handleDownload(qrCode)}
                    className="text-gray-600 hover:text-[#15342b]"
                    title="Download QR Code"
                  >
                    <Download size={20} />
                  </button>
                  <button
                    onClick={() => handleEdit(qrCode)}
                    className="text-gray-600 hover:text-[#15342b]"
                    title="Edit QR Code"
                  >
                    <Pencil size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(qrCode.id)}
                    className="text-gray-600 hover:text-red-600"
                    title="Delete QR Code"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              <div className="flex justify-center mb-4">
                <div id={`qr-${qrCode.id}`}>
                  <QRCodeSVG 
                    value={`${window.location.origin}/redirect/${qrCode.redirect_id}`}
                    size={200}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Original URL:</p>
                <a
                  href={qrCode.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-[#15342b] break-all"
                >
                  {qrCode.original_url}
                </a>
                <p className="text-sm font-medium text-gray-700 mt-2">Tracking URL:</p>
                <p className="text-sm text-gray-600 break-all">
                  {`${window.location.origin}/redirect/${qrCode.redirect_id}`}
                </p>
              </div>
            </div>
          ))}
        </div>

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

        {showStatsModal && selectedQRCode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-[#15342b]">
                  Statistics for {selectedQRCode.name}
                </h2>
                <button
                  onClick={() => setShowStatsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-lg font-semibold">Total Clicks: {selectedQRCode.click_count}</p>
                {selectedQRCode.last_clicked && (
                  <p className="text-gray-600">
                    Last clicked: {new Date(selectedQRCode.last_clicked).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Location</th>
                      <th className="text-left p-2">Device</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clicks.map((click, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">
                          {new Date(click.clicked_at).toLocaleString()}
                        </td>
                        <td className="p-2">
                          {click.city && click.country 
                            ? `${click.city}, ${click.country}`
                            : 'Location not available'}
                        </td>
                        <td className="p-2">
                          {click.user_agent?.split('/')[0] || 'Unknown'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;