import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Settings, Trash2 } from 'lucide-react';
import client from '../api/client';

export default function EditBill() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [bill, setBill] = useState<any>(null);

  useEffect(() => {
    client.get(`/bills/${id}`)
      .then(res => {
        setBill(res.data);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load bill details.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBill({ ...bill, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload: any = { ...bill };
      // Strip out computed or nested fields for update
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.user_id;
      
      if (payload.amount === '') payload.amount = null;

      await client.put(`/bills/${id}`, payload);
      navigate('/bills');
    } catch (err) {
      console.error(err);
      setError('Failed to update bill.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this bill? This cannot be undone.')) {
      try {
        await client.delete(`/bills/${id}`);
        navigate('/bills');
      } catch (err) {
        setError('Failed to delete bill.');
      }
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Loading...</div>;
  if (!bill) return <div className="p-12 text-center text-red-500">{error || 'Bill not found'}</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto p-6"
    >
      <div className="bg-card/40 backdrop-blur-xl rounded-2xl shadow-sm border border-border/40 p-8">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-secondary/20 rounded-xl text-gray-400">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Edit Bill</h1>
              <p className="text-gray-400">Update details for {bill.provider || 'Bill'}</p>
            </div>
          </div>
          <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete Bill">
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
              <label className="block text-sm font-medium text-gray-300 mb-1">Provider *</label>
              <input required type="text" name="provider" value={bill.provider || ''} onChange={handleChange}
                className="w-full px-4 py-2 bg-background/50 border border-border/30 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-foreground" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Amount</label>
              <input type="number" step="0.01" name="amount" value={bill.amount || ''} onChange={handleChange}
                className="w-full px-4 py-2 bg-background/50 border border-border/30 rounded-lg focus:ring-2 focus:ring-primary transition-all text-foreground" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Due Date</label>
              <input type="date" name="due_date" value={bill.due_date ? bill.due_date.split('T')[0] : ''} onChange={handleChange}
                className="w-full px-4 py-2 bg-background/50 border border-border/30 rounded-lg focus:ring-2 focus:ring-primary transition-all text-foreground" style={{colorScheme: 'dark'}} />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Billing Period</label>
              <input type="text" name="billing_period" value={bill.billing_period || ''} onChange={handleChange}
                className="w-full px-4 py-2 bg-background/50 border border-border/30 rounded-lg focus:ring-2 focus:ring-primary transition-all text-foreground" />
            </div>
          </div>

          <div className="pt-4 flex gap-3 justify-end border-t border-border/30">
            <button type="button" onClick={() => navigate('/bills')} className="px-5 py-2.5 text-gray-400 font-medium hover:bg-white/5 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
