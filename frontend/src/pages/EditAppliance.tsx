import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Settings, Trash2 } from 'lucide-react';
import client from '../api/client';

export default function EditAppliance() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [appliance, setAppliance] = useState<any>(null);

  useEffect(() => {
    client.get(`/appliances/${id}`)
      .then(res => {
        setAppliance(res.data);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load appliance details.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAppliance({ ...appliance, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload: any = { ...appliance };
      // Strip out computed or nested fields for update
      delete payload.id;
      delete payload.created_at;
      delete payload.age_years;
      delete payload.warranty;
      
      if (payload.purchase_price === '') payload.purchase_price = null;

      await client.put(`/appliances/${id}`, payload);
      navigate('/appliances');
    } catch (err) {
      console.error(err);
      setError('Failed to update appliance.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this appliance? This cannot be undone.')) {
      try {
        await client.delete(`/appliances/${id}`);
        navigate('/appliances');
      } catch (err) {
        setError('Failed to delete appliance.');
      }
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Loading...</div>;
  if (!appliance) return <div className="p-12 text-center text-red-500">{error || 'Appliance not found'}</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto p-6"
    >
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Edit Appliance</h1>
              <p className="text-slate-500">Update details for {appliance.name}</p>
            </div>
          </div>
          <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete Appliance">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-lg mb-6 bg-red-50 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Appliance Name *</label>
              <input required type="text" name="name" value={appliance.name || ''} onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
              <input type="text" name="brand" value={appliance.brand || ''} onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary transition-all" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Model Number</label>
              <input type="text" name="model_number" value={appliance.model_number || ''} onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary transition-all" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Serial Number</label>
              <input type="text" name="serial_number" value={appliance.serial_number || ''} onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary transition-all" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <input type="text" name="location" value={appliance.location || ''} onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary transition-all" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Date</label>
              <input type="date" name="purchase_date" value={appliance.purchase_date || ''} onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary transition-all" />
            </div>
          </div>

          <div className="pt-4 flex gap-3 justify-end border-t border-slate-100">
            <button type="button" onClick={() => navigate('/appliances')} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="bg-primary hover:bg-primary/90 text-white font-medium py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
