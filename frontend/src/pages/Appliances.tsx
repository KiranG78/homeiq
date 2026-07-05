import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, Package, Calendar, Settings, ShieldAlert, ShieldCheck } from 'lucide-react';
import client from '../api/client';

export default function Appliances() {
  const [appliances, setAppliances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/appliances/')
      .then(res => setAppliances(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const getWarrantyColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'expiring_soon': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'expired': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getWarrantyIcon = (status: string) => {
    switch(status) {
      case 'active': return <ShieldCheck className="w-4 h-4 mr-1" />;
      case 'expiring_soon': return <ShieldAlert className="w-4 h-4 mr-1" />;
      case 'expired': return <ShieldAlert className="w-4 h-4 mr-1" />;
      default: return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 max-w-7xl mx-auto"
    >
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Appliances</h1>
          <p className="text-slate-500">Track and manage your home appliances</p>
        </div>
        <Link to="/appliances/add" className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
          <Plus className="w-5 h-5" />
          Add Appliance
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading appliances...</div>
      ) : appliances.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">No appliances yet</h3>
          <p className="text-slate-500 mb-6">Add your first appliance to start tracking its details and warranty.</p>
          <Link to="/appliances/add" className="text-primary font-medium hover:underline">
            Add an appliance →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {appliances.map((app, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={app.id} 
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow group relative"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{app.name}</h3>
                  <p className="text-sm text-slate-500 capitalize">{app.category} • {app.brand}</p>
                </div>
                <Link to={`/appliances/${app.id}/edit`} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-primary transition-all rounded-lg hover:bg-primary/5">
                  <Settings className="w-5 h-5" />
                </Link>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 flex items-center gap-1.5"><Calendar className="w-4 h-4"/> Purchased</span>
                  <span className="font-medium text-slate-800">{app.purchase_date || 'Unknown'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 flex items-center gap-1.5"><Package className="w-4 h-4"/> Model #</span>
                  <span className="font-medium text-slate-800">{app.model_number || 'N/A'}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                {app.warranty ? (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getWarrantyColor(app.warranty.warranty_status)}`}>
                    {getWarrantyIcon(app.warranty.warranty_status)}
                    {app.warranty.warranty_status.replace('_', ' ').toUpperCase()}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-50 text-slate-500 border-slate-200">
                    No Warranty
                  </span>
                )}
                
                {app.age_years && (
                  <span className="text-xs text-slate-400 font-medium">{app.age_years} yrs old</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
