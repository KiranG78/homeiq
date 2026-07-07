import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, Package, Settings, ShieldAlert, ShieldCheck, ArrowUpDown, Trash2, Edit2, Eye, X, ExternalLink, FileText } from 'lucide-react';
import client, { API_BASE_URL } from '../api/client';

export default function Appliances({ isSubPage = false }: { isSubPage?: boolean }) {
  const [appliances, setAppliances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [selectedAppliance, setSelectedAppliance] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [warrantyFilter, setWarrantyFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this appliance?")) {
      try {
        await client.delete(`/appliances/${id}`);
        setAppliances(appliances.filter((a) => a.id !== id));
      } catch (error) {
        console.error("Failed to delete appliance:", error);
        alert("Failed to delete appliance.");
      }
    }
  };

  useEffect(() => {
    client.get('/appliances/')
      .then(res => setAppliances(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, warrantyFilter]);

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

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAppliances = useMemo(() => {
    return appliances.filter(app => {
      const matchesSearch = app.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            app.brand?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter ? app.category === categoryFilter : true;
      
      let matchesWarranty = true;
      if (warrantyFilter) {
        if (warrantyFilter === 'no_warranty') {
          matchesWarranty = !app.warranty;
        } else {
          matchesWarranty = app.warranty?.warranty_status === warrantyFilter;
        }
      }
      
      return matchesSearch && matchesCategory && matchesWarranty;
    });
  }, [appliances, searchQuery, categoryFilter, warrantyFilter]);

  const sortedAppliances = [...filteredAppliances].sort((a, b) => {
    if (!sortConfig) return 0;
    
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    
    if (sortConfig.key === 'warranty_status') {
      aValue = a.warranty?.warranty_status;
      bValue = b.warranty?.warranty_status;
    }

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const paginatedAppliances = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedAppliances.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedAppliances, currentPage]);

  const totalPages = Math.ceil(sortedAppliances.length / itemsPerPage);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={isSubPage ? "" : "p-4 md:p-6 max-w-7xl mx-auto"}
    >
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isSubPage ? 'mb-4' : 'mb-6 md:mb-8'}`}>
        {!isSubPage ? (
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">My Appliances</h1>
            <p className="text-sm md:text-base text-gray-400">Track and manage your home appliances</p>
          </div>
        ) : (
          <div className="flex-1"></div>
        )}
        <Link to="/appliances/add" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors">
          <Plus className="w-5 h-5" />
          Add Appliance
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
      ) : appliances.length === 0 ? (
        <div className="text-center py-20 bg-card/30 rounded-2xl border border-border/40 border-dashed">
          <Package className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No appliances yet</h3>
          <p className="text-gray-400 mb-6">Add your first appliance to start tracking its details and warranty.</p>
          <Link to="/appliances/add" className="text-primary font-medium hover:underline">
            Add an appliance →
          </Link>
        </div>
      ) : (
        <div>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input 
                type="text" 
                placeholder="Search appliances..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card/60 backdrop-blur-md border border-border/40 text-sm rounded-lg px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-card/60 backdrop-blur-md border border-border/40 text-sm rounded-lg px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none cursor-pointer"
            >
              <option value="">All Categories</option>
              <option value="refrigerator">Refrigerator</option>
              <option value="washer">Washer</option>
              <option value="dryer">Dryer</option>
              <option value="dishwasher">Dishwasher</option>
              <option value="hvac">HVAC</option>
              <option value="water_heater">Water Heater</option>
              <option value="tv">TV</option>
              <option value="microwave">Microwave</option>
              <option value="oven">Oven</option>
            </select>
            <select 
              value={warrantyFilter}
              onChange={(e) => setWarrantyFilter(e.target.value)}
              className="bg-card/60 backdrop-blur-md border border-border/40 text-sm rounded-lg px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none cursor-pointer"
            >
              <option value="">All Warranties</option>
              <option value="active">Active</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="no_warranty">No Warranty</option>
            </select>
          </div>

          <div className="overflow-x-auto bg-card/40 backdrop-blur-xl border border-border/40 rounded-2xl shadow-lg">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-secondary/20 border-b border-border/40 text-gray-400 text-sm">
                <th className="p-4 font-medium cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('category')}>
                  <div className="flex items-center gap-2">Category <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-4 font-medium cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-2">Name <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-4 font-medium cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('brand')}>
                  <div className="flex items-center gap-2">Brand <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-4 font-medium cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('purchase_price')}>
                  <div className="flex items-center gap-2">Purchase Price <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-4 font-medium cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('warranty_status')}>
                  <div className="flex items-center gap-2">Warranty Status <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAppliances.map((app, idx) => (
                <motion.tr
                  key={app.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="border-b border-border/20 hover:bg-white/5 transition-colors group cursor-pointer"
                  onClick={() => setSelectedAppliance(app)}
                >
                  <td className="p-4">
                    <span className="capitalize text-sm font-medium text-gray-300">{app.category}</span>
                  </td>
                  <td className="p-4 font-bold text-foreground">{app.name}</td>
                  <td className="p-4 text-gray-400">{app.brand || 'N/A'}</td>
                  <td className="p-4 font-semibold text-foreground">{app.purchase_price ? `$${app.purchase_price}` : '-'}</td>
                  <td className="p-4">
                    {app.warranty ? (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getWarrantyColor(app.warranty.warranty_status)}`}>
                        {getWarrantyIcon(app.warranty.warranty_status)}
                        {app.warranty.warranty_status.replace('_', ' ').toUpperCase()}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-500/10 text-slate-400 border-slate-500/20">
                        No Warranty
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAppliance(app);
                        }}
                        className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors" 
                        title="View Appliance"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <Link 
                        to={`/appliances/${app.id}/edit`} 
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" 
                        title="Edit Appliance"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(app.id);
                        }}
                        className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" 
                        title="Delete Appliance"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {paginatedAppliances.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No appliances match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
            <span className="text-sm text-gray-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedAppliances.length)} of {sortedAppliances.length} entries
            </span>
            <div className="flex gap-2 overflow-x-auto max-w-full pb-2 sm:pb-0">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 sm:px-4 py-2 rounded-lg bg-card border border-border/40 text-sm font-medium hover:bg-secondary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  // Show max 5 page buttons around current
                  if (totalPages > 5) {
                    if (i !== 0 && i !== totalPages - 1 && Math.abs(currentPage - 1 - i) > 1) {
                      if (i === 1 || i === totalPages - 2) return <span key={i} className="flex items-center px-2 text-gray-500">...</span>;
                      return null;
                    }
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-9 h-9 rounded-lg border text-sm font-medium flex items-center justify-center transition-colors shrink-0 ${
                        currentPage === i + 1 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'bg-card border-border/40 hover:bg-secondary/20 text-foreground'
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 sm:px-4 py-2 rounded-lg bg-card border border-border/40 text-sm font-medium hover:bg-secondary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
        </div>
      )}

      {/* Details Modal */}
      <AnimatePresence>
        {selectedAppliance && (
          <>
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
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
