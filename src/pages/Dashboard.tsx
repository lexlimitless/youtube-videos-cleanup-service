import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Pencil, Trash2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface QRCode {
  id: string;
  name: string;
  url: string;
  created_at: string;
  clerk_user_id: string;
}

const Dashboard = () => {
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    if (!user) {
      navigate('/sign-in');
      return;
    }
    setupSupabase();
    fetchQRCodes();
  }, [user]);

  const setupSupabase = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase.rpc('set_clerk_user_id', {
        user_id: user.id
      });
      if (error) {
        console.error('Error setting user ID:', error);
      }
    } catch (error) {
      console.error('Error in setupSupabase:', error);
    }
  };

  const fetchQRCodes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQrCodes(data || []);
    } catch (error: any) {
      toast.error('Error fetching QR codes');
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to continue');
      navigate('/sign-in');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('qr_codes')
          .update({ name, url })
          .eq('id', editingId)
          .eq('clerk_user_id', user.id);

        if (error) throw error;
        toast.success('QR code updated successfully');
      } else {
        const { error } = await supabase
          .from('qr_codes')
          .insert([{
            name,
            url,
            clerk_user_id: user.id
          }]);

        if (error) throw error;
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
    if (!user) {
      toast.error('Please sign in to continue');
      navigate('/sign-in');
      return;
    }

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
                <h3 className="text-xl font-semibold text-[#15342b]">{qrCode.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(qrCode)}
                    className="text-gray-600 hover:text-[#15342b]"
                  >
                    <Pencil size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(qrCode.id)}
                    className="text-gray-600 hover:text-red-600"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              <div className="flex justify-center mb-4">
                <QRCodeSVG value={qrCode.url} size={200} />
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

export default Dashboard;