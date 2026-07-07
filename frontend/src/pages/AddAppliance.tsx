import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PackagePlus, Calendar, Tag, Info, Shield, UploadCloud, X, Loader2 } from 'lucide-react';
import client from '../api/client';

export default function AddAppliance() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [appliance, setAppliance] = useState({
    name: '',
    category: 'refrigerator',
    brand: '',
    model_number: '',
    serial_number: '',
    purchase_date: '',
    purchase_price: '',
    location: '',
    invoice_image_path: '',
    extracted_raw_text: '',
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

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, WEBP)');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError('');
  };

  const handleExtract = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await client.post('/documents/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const { extracted, image_path } = res.data;
      
      setAppliance(prev => ({
        ...prev,
        name: extracted.appliance_name || prev.name,
        category: extracted.category || prev.category,
        brand: extracted.brand || prev.brand,
        model_number: extracted.model_number || prev.model_number,
        serial_number: extracted.serial_number || prev.serial_number,
        purchase_date: extracted.purchase_date || prev.purchase_date,
        purchase_price: extracted.purchase_price ? String(extracted.purchase_price) : prev.purchase_price,
        invoice_image_path: image_path || '',
        extracted_raw_text: JSON.stringify(extracted),
      }));
      
      if (extracted.warranty_expiry_date || extracted.warranty_provider) {
        setWarranty(prev => ({
          ...prev,
          enabled: true,
          expiry_date: extracted.warranty_expiry_date || prev.expiry_date,
          provider_name: extracted.warranty_provider || prev.provider_name,
        }));
      }

      setActiveTab('manual');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Extraction failed. Please try again or enter manually.');
    } finally {
      setLoading(false);
    }
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
      <div className="bg-card/40 backdrop-blur-xl rounded-2xl shadow-lg border border-border/40 overflow-hidden">
        
        {/* Tabs */}
        <div className="flex border-b border-border/40 bg-secondary/20">
          <button 
            className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'manual' ? 'text-primary border-b-2 border-primary bg-secondary/30' : 'text-gray-400 hover:text-gray-200 hover:bg-secondary/20'}`}
            onClick={() => setActiveTab('manual')}
          >
            Manual Entry
          </button>
          <button 
            className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'upload' ? 'text-primary border-b-2 border-primary bg-secondary/30' : 'text-gray-400 hover:text-gray-200 hover:bg-secondary/20'}`}
            onClick={() => setActiveTab('upload')}
          >
            Upload Invoice (Auto-Extract)
          </button>
        </div>

        <div className="p-8">
          {error && (
            <div className="p-4 rounded-lg mb-6 bg-red-50 text-red-700 border border-red-100">
              {error}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div 
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all ${dragActive ? 'border-primary bg-primary/10' : 'border-border/40 bg-secondary/20'} ${!selectedFile ? 'hover:border-primary hover:bg-secondary/30 cursor-pointer' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
                }}
                onClick={() => !selectedFile && fileInputRef.current?.click()}
              >
                <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files && handleFile(e.target.files[0])} accept="image/*" />
                
                {selectedFile ? (
                  <div className="w-full relative flex flex-col items-center">
                    <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(null); }} className="absolute -top-4 -right-4 p-2 bg-secondary rounded-full shadow-md text-gray-400 hover:text-red-400 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                    <img src={previewUrl!} alt="Preview" className="max-h-64 object-contain rounded-lg border border-border/40 shadow-sm mb-4" />
                    <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center shadow-sm mb-4 text-primary">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-1">Upload your invoice or receipt</h3>
                    <p className="text-gray-400 text-sm mb-4 text-center">Drag and drop an image file here, or click to browse.</p>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setActiveTab('manual')} className="px-5 py-2.5 text-gray-400 font-medium hover:bg-secondary/50 rounded-lg transition-colors">
                  Skip
                </button>
                <button type="button" onClick={handleExtract} disabled={!selectedFile || loading}
                  className="bg-primary hover:bg-primary/90 text-white font-medium py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                  {loading ? 'Reading Invoice...' : 'Extract Details'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'manual' && (
            <form onSubmit={handleSubmit} className="space-y-8" autoComplete="off">
              {/* Basic Details */}
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 border-b border-border/40 pb-2">
                  <Info className="w-5 h-5 text-gray-400"/> Basic Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Appliance Name *</label>
                    <input required type="text" name="name" value={appliance.name} onChange={handleChange}
                      className="w-full px-4 py-2 bg-secondary/20 border border-border/40 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground transition-all"
                      placeholder="e.g. Kitchen Fridge" autoComplete="off" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Category *</label>
                    <select name="category" value={appliance.category} onChange={handleChange}
                      className="w-full px-4 py-2 bg-secondary/20 border border-border/40 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground transition-all">
                      <option value="refrigerator" className="bg-card">Refrigerator</option>
                      <option value="hvac" className="bg-card">HVAC</option>
                      <option value="dishwasher" className="bg-card">Dishwasher</option>
                      <option value="washer" className="bg-card">Washer</option>
                      <option value="dryer" className="bg-card">Dryer</option>
                      <option value="oven" className="bg-card">Oven</option>
                      <option value="water_heater" className="bg-card">Water Heater</option>
                      <option value="other" className="bg-card">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Brand</label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" name="brand" value={appliance.brand} onChange={handleChange}
                        className="w-full pl-9 pr-4 py-2 bg-secondary/20 border border-border/40 rounded-lg focus:ring-2 focus:ring-primary text-foreground transition-all"
                        placeholder="Samsung" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
                    <input type="text" name="location" value={appliance.location} onChange={handleChange}
                      className="w-full px-4 py-2 bg-secondary/20 border border-border/40 rounded-lg focus:ring-2 focus:ring-primary text-foreground transition-all"
                      placeholder="Kitchen" autoComplete="off" />
                  </div>
                </div>
              </section>

              {/* Identification & Purchase */}
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 border-b border-border/40 pb-2">
                  <PackagePlus className="w-5 h-5 text-gray-400"/> Identification & Purchase
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Model Number</label>
                    <input type="text" name="model_number" value={appliance.model_number} onChange={handleChange}
                      className="w-full px-4 py-2 bg-secondary/20 border border-border/40 rounded-lg focus:ring-2 focus:ring-primary text-foreground transition-all" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Serial Number</label>
                    <input type="text" name="serial_number" value={appliance.serial_number} onChange={handleChange}
                      className="w-full px-4 py-2 bg-secondary/20 border border-border/40 rounded-lg focus:ring-2 focus:ring-primary text-foreground transition-all" autoComplete="off" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Purchase Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="date" name="purchase_date" value={appliance.purchase_date} onChange={handleChange}
                        className="w-full pl-9 pr-4 py-2 bg-secondary/20 border border-border/40 rounded-lg focus:ring-2 focus:ring-primary text-foreground transition-all" style={{colorScheme: 'dark'}} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Purchase Price ($)</label>
                    <input type="number" step="0.01" name="purchase_price" value={appliance.purchase_price} onChange={handleChange}
                      className="w-full px-4 py-2 bg-secondary/20 border border-border/40 rounded-lg focus:ring-2 focus:ring-primary text-foreground transition-all" />
                  </div>
                </div>
              </section>

              {/* Warranty */}
              <section className="space-y-4 bg-secondary/10 p-5 rounded-xl border border-border/40">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Shield className="w-5 h-5 text-gray-400"/> Warranty Information
                  </h2>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="enabled" checked={warranty.enabled} onChange={handleWarrantyChange}
                      className="w-5 h-5 text-primary rounded focus:ring-primary border-border bg-secondary/50" />
                    <span className="text-sm font-medium text-gray-300">Add Warranty</span>
                  </label>
                </div>

                {warranty.enabled && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Warranty Type</label>
                      <select name="warranty_type" value={warranty.warranty_type} onChange={handleWarrantyChange}
                        className="w-full px-4 py-2 bg-secondary/20 border border-border/40 rounded-lg focus:ring-2 focus:ring-primary text-foreground">
                        <option value="manufacturer" className="bg-card">Manufacturer</option>
                        <option value="extended" className="bg-card">Extended</option>
                        <option value="home_shield" className="bg-card">Home Shield</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Provider Name</label>
                      <input type="text" name="provider_name" value={warranty.provider_name} onChange={handleWarrantyChange}
                        className="w-full px-4 py-2 bg-secondary/20 border border-border/40 rounded-lg focus:ring-2 focus:ring-primary text-foreground" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                      <input type="date" name="start_date" value={warranty.start_date} onChange={handleWarrantyChange}
                        className="w-full px-4 py-2 bg-secondary/20 border border-border/40 rounded-lg focus:ring-2 focus:ring-primary text-foreground" style={{colorScheme: 'dark'}} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Expiry Date *</label>
                      <input required={warranty.enabled} type="date" name="expiry_date" value={warranty.expiry_date} onChange={handleWarrantyChange}
                        className="w-full px-4 py-2 bg-secondary/20 border border-border/40 rounded-lg focus:ring-2 focus:ring-primary text-foreground" style={{colorScheme: 'dark'}} />
                    </div>
                  </motion.div>
                )}
              </section>

              <div className="pt-4 flex gap-3 justify-end">
                <button type="button" onClick={() => navigate('/appliances')} className="px-5 py-2.5 text-gray-400 font-medium hover:bg-secondary/50 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="bg-primary hover:bg-primary/90 text-white font-medium py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                  {loading ? 'Saving...' : 'Save Appliance'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </motion.div>
  );
}
