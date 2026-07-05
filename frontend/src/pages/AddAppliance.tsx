import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PackagePlus, Calendar, Tag, Info, Shield } from 'lucide-react';
import client from '../api/client';

export default function AddAppliance() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [appliance, setAppliance] = useState({
    name: '',
    category: 'refrigerator',
    brand: '',
    model_number: '',
    serial_number: '',
    purchase_date: '',
    purchase_price: '',
    location: '',
  });

  const [warranty, setWarranty] = useState({
    enabled: false,
    warranty_type: 'manufacturer',
    start_date: '',
    expiry_date: '',
    provider_name: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAppliance({ ...appliance, [e.target.name]: e.target.value });
  };

  const handleWarrantyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setWarranty({ ...warranty, [e.target.name]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload: any = {
        ...appliance,
        purchase_price: appliance.purchase_price ? parseFloat(appliance.purchase_price) : null,
      };

      if (warranty.enabled && warranty.expiry_date) {
        payload.warranty = {
          warranty_type: warranty.warranty_type,
          start_date: warranty.start_date || null,
          expiry_date: warranty.expiry_date,
          provider_name: warranty.provider_name || null,
        };
      }

      await client.post('/appliances/', payload);
      navigate('/appliances');
    } catch (err) {
      console.error(err);
      setError('Failed to add appliance. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto p-6"
    >
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <PackagePlus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Add Appliance</h1>
            <p className="text-slate-500">Manually enter appliance details</p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg mb-6 bg-red-50 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Details */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 border-b pb-2">
              <Info className="w-5 h-5 text-slate-400"/> Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Appliance Name *</label>
                <input required type="text" name="name" value={appliance.name} onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="e.g. Kitchen Fridge" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                <select name="category" value={appliance.category} onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all">
                  <option value="refrigerator">Refrigerator</option>
                  <option value="hvac">HVAC</option>
                  <option value="dishwasher">Dishwasher</option>
                  <option value="washer">Washer</option>
                  <option value="dryer">Dryer</option>
                  <option value="oven">Oven</option>
                  <option value="water_heater">Water Heater</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" name="brand" value={appliance.brand} onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary transition-all"
                    placeholder="Samsung" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input type="text" name="location" value={appliance.location} onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary transition-all"
                  placeholder="Kitchen" />
              </div>
            </div>
          </section>

          {/* Identification & Purchase */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 border-b pb-2">
              <PackagePlus className="w-5 h-5 text-slate-400"/> Identification & Purchase
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Model Number</label>
                <input type="text" name="model_number" value={appliance.model_number} onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary transition-all" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Serial Number</label>
                <input type="text" name="serial_number" value={appliance.serial_number} onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary transition-all" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="date" name="purchase_date" value={appliance.purchase_date} onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Price ($)</label>
                <input type="number" step="0.01" name="purchase_price" value={appliance.purchase_price} onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary transition-all" />
              </div>
            </div>
          </section>

          {/* Warranty */}
          <section className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Shield className="w-5 h-5 text-slate-400"/> Warranty Information
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="enabled" checked={warranty.enabled} onChange={handleWarrantyChange}
                  className="w-5 h-5 text-primary rounded focus:ring-primary border-slate-300" />
                <span className="text-sm font-medium text-slate-700">Add Warranty</span>
              </label>
            </div>

            {warranty.enabled && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Warranty Type</label>
                  <select name="warranty_type" value={warranty.warranty_type} onChange={handleWarrantyChange}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary">
                    <option value="manufacturer">Manufacturer</option>
                    <option value="extended">Extended</option>
                    <option value="home_shield">Home Shield</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Provider Name</label>
                  <input type="text" name="provider_name" value={warranty.provider_name} onChange={handleWarrantyChange}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input type="date" name="start_date" value={warranty.start_date} onChange={handleWarrantyChange}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date *</label>
                  <input required={warranty.enabled} type="date" name="expiry_date" value={warranty.expiry_date} onChange={handleWarrantyChange}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary" />
                </div>
              </motion.div>
            )}
          </section>

          <div className="pt-4 flex gap-3 justify-end">
            <button type="button" onClick={() => navigate('/appliances')} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="bg-primary hover:bg-primary/90 text-white font-medium py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Appliance'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
