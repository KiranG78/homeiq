import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PackageSearch, Activity, MessageSquare, ArrowRight, ShieldAlert, ScanLine, FileText, Package, ExternalLink, X, ShieldCheck } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import client, { API_BASE_URL } from '../api/client';

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const [appliances, setAppliances] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [activeReturns, setActiveReturns] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [energyData, setEnergyData] = useState<any[]>([]);
  const [selectedAppliance, setSelectedAppliance] = useState<any | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);

  useEffect(() => {
    client.get('/appliances/')
      .then(res => setAppliances(res.data))
      .catch(err => console.error(err));
      
    client.get('/documents/active-returns')
      .then(res => setActiveReturns(res.data))
      .catch(err => console.error(err));
      
    client.get('/documents/')
      .then(res => setDocuments(res.data))
      .catch(err => console.error(err));
      
    client.get('/dashboard/insights')
      .then(res => setInsights(res.data))
      .catch(err => console.error(err));
      
    client.get('/dashboard/energy-trend')
      .then(res => setEnergyData(res.data))
      .catch(err => console.error(err));
  }, []);

  const alerts = appliances.filter(app => 
    app.warranty && (app.warranty.warranty_status === 'expiring_soon' || app.warranty.warranty_status === 'expired')
  );

  // Appliance Value breakdown
  const categoryValues = appliances.reduce((acc, app) => {
    const cat = app.category || 'other';
    const price = app.purchase_price || 0;
    acc[cat] = (acc[cat] || 0) + price;
    return acc;
  }, {} as Record<str, number>);

  const pieData = Object.keys(categoryValues).map(key => ({
    name: key,
    value: categoryValues[key]
  })).filter(d => d.value > 0);

  // Health Score removed

  const getInsightColorClasses = (color: string) => {
    switch (color) {
      case 'orange': return { border: 'border-orange-500/50', bg: 'bg-orange-500' };
      case 'red': return { border: 'border-red-500/50', bg: 'bg-red-500' };
      case 'primary': return { border: 'border-primary/50', bg: 'bg-primary' };
      default: return { border: 'border-gray-500/50', bg: 'bg-gray-500' };
    }
  };

  const getWarrantyColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'expiring_soon': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'expired': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getWarrantyIcon = (status: string) => {
    switch (status) {
      case 'active': return <ShieldCheck className="w-4 h-4 mr-1" />;
      case 'expiring_soon': return <ShieldAlert className="w-4 h-4 mr-1" />;
      case 'expired': return <ShieldAlert className="w-4 h-4 mr-1" />;
      default: return null;
    }
  };



  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto pt-2 pb-6 px-4 space-y-8 relative">

      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-center mt-2 gap-8"
      >
        <div className="w-full">
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight mb-2">
            Your Home, <span className="bg-gradient-to-r from-primary via-purple-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-sm">Quantified.</span>
          </h1>
          <p className="text-gray-400 max-w-xl">
            Proactive insights, predictive maintenance, and complete control over your household assets.
          </p>
        </div>
      </motion.div>

      {/* Actionable Insights Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Returns */}
        {activeReturns.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card/40 backdrop-blur-xl border border-red-500/30 rounded-2xl p-6 shadow-lg relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl rounded-full" />
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-red-400" />
              Active Returns Expiring Soon
            </h2>
            <div className="space-y-3">
              {activeReturns.map(doc => (
                <div key={doc.id} className="bg-background/50 border border-border/40 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-foreground">
                      <button 
                        onClick={() => setSelectedDocument(doc)}
                        className="hover:underline hover:text-cyan-400 transition-colors text-left"
                      >
                        {doc.title || 'Receipt'}
                      </button>
                    </h4>
                    <p className="text-sm text-red-400/90 font-medium">Expires: {doc.return_expiration_date}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Predictive Maintenance Timeline (Mock) */}
        <motion.div
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           className="bg-card/40 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-6 shadow-lg relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full" />
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-6 h-6 text-orange-400" />
            Predictive Maintenance Timeline
          </h2>
          <div className="space-y-4">
            {insights.length > 0 ? insights.map((insight, idx) => {
              const colors = getInsightColorClasses(insight.color);
              return (
                <div key={idx} className={`relative pl-6 border-l-2 ${colors.border}`}>
                  <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full ${colors.bg} ring-4 ring-background`} />
                  <h4 className="text-sm font-semibold text-foreground">
                    <button 
                      onClick={() => {
                        const app = appliances.find(a => a.id === insight.appliance_id);
                        if (app) setSelectedAppliance(app);
                      }}
                      className="hover:underline hover:text-cyan-400 transition-colors text-left"
                    >
                      {insight.title}
                    </button>
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">{insight.description}</p>
                </div>
              );
            }) : (
              <p className="text-sm text-gray-500">No predictive insights available right now.</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Data Visualization Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
        <motion.div className="lg:col-span-2 bg-card/40 backdrop-blur-xl border border-border/40 rounded-2xl p-6 shadow-lg flex flex-col">
           <h3 className="text-lg font-bold text-foreground mb-6">12-Month Energy Cost Trend</h3>
           <div className="flex-1 min-h-[200px]">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={energyData}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                 <XAxis dataKey="name" stroke="#888" tick={{fill: '#888'}} axisLine={false} />
                 <YAxis stroke="#888" tick={{fill: '#888'}} axisLine={false} tickFormatter={(val) => `$${val}`} />
                 <RechartsTooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px'}} />
                 <Line type="monotone" dataKey="cost" stroke="#0ea5e9" strokeWidth={3} dot={{r: 4, fill: '#0ea5e9'}} activeDot={{r: 6, fill: '#fff', stroke: '#0ea5e9', strokeWidth: 2}} />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </motion.div>

        <motion.div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-2xl p-6 shadow-lg flex flex-col">
           <h3 className="text-lg font-bold text-foreground mb-6">Appliance Value Breakdown</h3>
           <div className="flex-1 min-h-[200px] flex items-center justify-center">
             {pieData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={pieData}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                     stroke="none"
                   >
                     {pieData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <RechartsTooltip formatter={(val) => `$${val}`} contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px'}} />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
               <div className="text-gray-500 text-sm">Add appliances with purchase prices to see breakdown.</div>
             )}
           </div>
        </motion.div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedAppliance && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedAppliance(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border/40 rounded-2xl shadow-2xl overflow-hidden w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-border/40 bg-secondary/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl border bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{selectedAppliance.name || 'Appliance Details'}</h2>
                    <p className="text-sm text-gray-400 capitalize">{selectedAppliance.category}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAppliance(null)}
                  className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-foreground transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="bg-background/50 rounded-xl border border-border/30 overflow-hidden">
                  <table className="w-full text-left">
                    <tbody className="divide-y divide-border/20">
                      <tr className="hover:bg-white/5 transition-colors">
                        <th className="p-4 font-medium text-gray-400 w-1/3">Brand</th>
                        <td className="p-4 font-medium text-foreground">{selectedAppliance.brand || 'N/A'}</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <th className="p-4 font-medium text-gray-400">Model Number</th>
                        <td className="p-4 font-medium text-foreground">{selectedAppliance.model_number || 'N/A'}</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <th className="p-4 font-medium text-gray-400">Serial Number</th>
                        <td className="p-4 font-medium text-foreground">{selectedAppliance.serial_number || 'N/A'}</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <th className="p-4 font-medium text-gray-400">Purchase Price</th>
                        <td className="p-4 font-semibold text-primary">{selectedAppliance.purchase_price ? `$${selectedAppliance.purchase_price}` : 'N/A'}</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <th className="p-4 font-medium text-gray-400">Warranty Status</th>
                        <td className="p-4 font-medium">
                          {selectedAppliance.warranty ? (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getWarrantyColor(selectedAppliance.warranty.warranty_status)}`}>
                              {getWarrantyIcon(selectedAppliance.warranty.warranty_status)}
                              {selectedAppliance.warranty.warranty_status.replace('_', ' ').toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-gray-500">No Warranty</span>
                          )}
                        </td>
                      </tr>
                      {selectedAppliance.warranty && (
                        <>
                          <tr className="hover:bg-white/5 transition-colors">
                            <th className="p-4 font-medium text-gray-400">Warranty Expiry</th>
                            <td className="p-4 font-medium text-foreground">{selectedAppliance.warranty.expiry_date || 'N/A'}</td>
                          </tr>
                          <tr className="hover:bg-white/5 transition-colors">
                            <th className="p-4 font-medium text-gray-400">Provider Name</th>
                            <td className="p-4 font-medium text-foreground">{selectedAppliance.warranty.provider_name || 'N/A'}</td>
                          </tr>
                          <tr className="hover:bg-white/5 transition-colors">
                            <th className="p-4 font-medium text-gray-400">Claim Contact</th>
                            <td className="p-4 font-medium text-foreground">
                              {[selectedAppliance.warranty.claim_phone, selectedAppliance.warranty.claim_email, selectedAppliance.warranty.claim_url].filter(Boolean).join(' | ') || 'N/A'}
                            </td>
                          </tr>
                          {selectedAppliance.warranty.coverage_summary && (
                            <tr className="hover:bg-white/5 transition-colors">
                              <th className="p-4 font-medium text-gray-400 align-top">Coverage Summary</th>
                              <td className="p-4 font-medium text-foreground text-sm whitespace-pre-wrap">{selectedAppliance.warranty.coverage_summary}</td>
                            </tr>
                          )}
                        </>
                      )}
                      <tr className="hover:bg-white/5 transition-colors">
                        <th className="p-4 font-medium text-gray-400">Lifespan Used</th>
                        <td className="p-4 font-medium text-foreground">
                          {selectedAppliance.lifespan_used_pct ? `${selectedAppliance.lifespan_used_pct.toFixed(1)}%` : 'N/A'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {selectedAppliance.invoice_image_path && (
                  <div className="pt-4 border-t border-border/40 text-center flex flex-col sm:flex-row justify-center gap-4">
                    <a 
                      href={`${API_BASE_URL}${selectedAppliance.invoice_image_path}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground font-medium rounded-xl transition-colors"
                    >
                      <ExternalLink className="w-5 h-5" /> View Original Document Image
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Details Modal */}
      <AnimatePresence>
        {selectedDocument && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedDocument(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border/40 rounded-2xl shadow-2xl overflow-hidden w-full max-w-xl max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-border/40 bg-secondary/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl border bg-red-500/10 text-red-400 border-red-500/20">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{selectedDocument.title || 'Document Details'}</h2>
                    <p className="text-sm text-gray-400 capitalize">{selectedDocument.document_type || 'Receipt'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDocument(null)}
                  className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-foreground transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="bg-background/50 rounded-xl border border-border/30 overflow-hidden">
                  <table className="w-full text-left">
                    <tbody className="divide-y divide-border/20">
                      <tr className="hover:bg-white/5 transition-colors">
                        <th className="p-4 font-medium text-gray-400 w-1/3">Store/Issuer</th>
                        <td className="p-4 font-medium text-foreground">{selectedDocument.store_name || 'N/A'}</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <th className="p-4 font-medium text-gray-400">Amount</th>
                        <td className="p-4 font-semibold text-primary">{selectedDocument.total_amount ? `$${selectedDocument.total_amount}` : 'N/A'}</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <th className="p-4 font-medium text-gray-400">Purchase Date</th>
                        <td className="p-4 font-medium text-foreground">{selectedDocument.purchase_date || 'N/A'}</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <th className="p-4 font-medium text-gray-400">Return Expiration</th>
                        <td className="p-4 font-medium text-red-400">{selectedDocument.return_expiration_date || 'N/A'}</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <th className="p-4 font-medium text-gray-400 align-top">Notes</th>
                        <td className="p-4 font-medium text-foreground text-sm whitespace-pre-wrap">{selectedDocument.notes || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {selectedDocument.image_path && (
                  <div className="pt-4 border-t border-border/40 text-center flex flex-col sm:flex-row justify-center gap-4">
                    <a 
                      href={`${API_BASE_URL}${selectedDocument.image_path}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground font-medium rounded-xl transition-colors"
                    >
                      <ExternalLink className="w-5 h-5" /> View Original Document Image
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
