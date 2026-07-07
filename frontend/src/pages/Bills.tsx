import { useState, useEffect, useMemo } from 'react';
import { FileText, Loader2, Calendar, DollarSign, Building, ArrowUpDown, X, ExternalLink, Eye, Edit2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import apiClient from '../api/client';

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

interface Bill {
  id: number;
  provider: string;
  amount: number;
  due_date: string;
  billing_period: string;
  image_path?: string;
  extracted_json?: string;
  created_at: string;
}



export default function Bills({ isSubPage = false }: { isSubPage?: boolean }) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('6m');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const { data } = await apiClient.get('/bills');
      setBills(data);
    } catch (err) {
      setError('Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFilter, customStartDate, customEndDate]);

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this bill?")) {
      try {
        await apiClient.delete(`/bills/${id}`);
        setBills(bills.filter((b) => b.id !== id));
      } catch (error) {
        console.error("Failed to delete bill:", error);
        alert("Failed to delete bill.");
      }
    }
  };

  const filteredBills = useMemo(() => {
    let daysToSubtract = 0;
    if (dateFilter === '7d') daysToSubtract = 7;
    else if (dateFilter === '1m') daysToSubtract = 30;
    else if (dateFilter === '3m') daysToSubtract = 90;
    else if (dateFilter === '6m') daysToSubtract = 180;
    
    return bills.filter(bill => {
      if (searchQuery && !bill.provider?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      const dateStr = bill.due_date || bill.created_at;
      if (!dateStr) return true;
      const bDate = new Date(dateStr);
      if (isNaN(bDate.getTime())) return true;
      
      if (dateFilter === 'custom') {
        if (customStartDate && new Date(customStartDate) > bDate) return false;
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (end < bDate) return false;
        }
        return true;
      }
      
      if (daysToSubtract > 0) {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - daysToSubtract);
        threshold.setHours(0, 0, 0, 0);
        if (bDate < threshold) return false;
      }
      return true;
    });
  }, [bills, dateFilter, customStartDate, customEndDate]);

  const trendData = useMemo(() => {
    if (!filteredBills.length) return [];
    
    const isDaily = dateFilter === '7d' || dateFilter === '1m';
    
    if (isDaily) {
      const dailyTotals: Record<string, number> = {};
      filteredBills.forEach(bill => {
        const dateStr = bill.due_date || bill.created_at;
        if (dateStr) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            const dayKey = `${date.getMonth()+1}/${date.getDate()}`;
            if (!dailyTotals[dayKey]) dailyTotals[dayKey] = 0;
            dailyTotals[dayKey] += Number(bill.amount) || 0;
          }
        }
      });
      const daysToIterate = dateFilter === '7d' ? 7 : 30;
      const dailyData = [];
      const today = new Date();
      for (let i = daysToIterate - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dayKey = `${d.getMonth()+1}/${d.getDate()}`;
        dailyData.push({
          name: dayKey,
          amount: dailyTotals[dayKey] || 0
        });
      }
      return dailyData;
    } else {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyTotals: Record<string, number> = {};
      
      filteredBills.forEach(bill => {
        const dateStr = bill.due_date || bill.created_at;
        if (dateStr) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            const monthYear = `${date.getFullYear()}-${date.getMonth()}`;
            if (!monthlyTotals[monthYear]) monthlyTotals[monthYear] = 0;
            monthlyTotals[monthYear] += Number(bill.amount) || 0;
          }
        }
      });

      if (dateFilter === 'custom') {
         const unsorted = Object.keys(monthlyTotals).map(key => {
            const [y, m] = key.split('-');
            return {
              sortVal: parseInt(y) * 100 + parseInt(m),
              name: `${monthNames[parseInt(m)]} ${y.substring(2)}`,
              amount: monthlyTotals[key]
            };
         });
         return unsorted.sort((a,b) => a.sortVal - b.sortVal).map(item => ({ name: item.name, amount: item.amount }));
      } else {
         const monthsToIterate = dateFilter === '3m' ? 3 : 6;
         const monthlyData = [];
         const today = new Date();
         for (let i = monthsToIterate - 1; i >= 0; i--) {
           const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
           const monthYear = `${d.getFullYear()}-${d.getMonth()}`;
           monthlyData.push({
             name: monthNames[d.getMonth()],
             amount: monthlyTotals[monthYear] || 0
           });
         }
         return monthlyData;
      }
    }
  }, [filteredBills, dateFilter]);

  const providerData = useMemo(() => {
    if (!filteredBills.length) return [];
    
    const providerTotals: Record<string, number> = {};
    filteredBills.forEach(bill => {
      const provider = bill.provider || 'Unknown';
      providerTotals[provider] = (providerTotals[provider] || 0) + (Number(bill.amount) || 0);
    });
    
    return Object.entries(providerTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredBills]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedBills = [...filteredBills].sort((a, b) => {
    if (!sortConfig) return 0;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aValue = (a as any)[sortConfig.key];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bValue = (b as any)[sortConfig.key];

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const paginatedBills = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedBills.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedBills, currentPage]);

  const totalPages = Math.ceil(sortedBills.length / itemsPerPage);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={isSubPage ? "" : "max-w-7xl mx-auto py-8 px-4 md:px-8"}
    >
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isSubPage ? 'mb-4' : 'mb-8'}`}>
        {!isSubPage ? (
          <div>
            <h1 className="text-3xl font-bold text-foreground">Utility Bills</h1>
            <p className="text-gray-400 mt-2">Track your monthly expenses and energy consumption.</p>
          </div>
        ) : (
          <div className="flex-1"></div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={customStartDate} 
                onChange={e => setCustomStartDate(e.target.value)}
                className="bg-card/60 backdrop-blur-md border border-border/40 text-sm rounded-lg px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none hover:border-primary/50 transition-colors" 
              />
              <span className="text-gray-400 font-medium">to</span>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={e => setCustomEndDate(e.target.value)}
                className="bg-card/60 backdrop-blur-md border border-border/40 text-sm rounded-lg px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none hover:border-primary/50 transition-colors" 
              />
            </div>
          )}
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-card/60 backdrop-blur-md border border-border/40 text-sm rounded-lg px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none hover:border-primary/50 transition-colors cursor-pointer appearance-none"
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          >
            <option value="7d">Last 7 Days</option>
            <option value="1m">Last 1 Month</option>
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-md mb-8">
          {error}
        </div>
      )}

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-card/40 backdrop-blur-xl border border-border/40 rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-foreground mb-6">
            {dateFilter === '7d' && '7-Day Utility Trend'}
            {dateFilter === '1m' && '1-Month Utility Trend'}
            {dateFilter === '3m' && '3-Month Utility Trend'}
            {dateFilter === '6m' && '6-Month Utility Trend'}
            {dateFilter === 'custom' && 'Custom Utility Trend'}
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ color: '#38bdf8' }}
                />
                <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6'}} activeDot={{r: 6, fill: '#fff', stroke: '#3b82f6', strokeWidth: 2}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-foreground mb-6">Spend by Provider</h2>
          <div className="h-72 w-full flex items-center justify-center">
             {providerData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={providerData}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                     stroke="none"
                   >
                     {providerData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <RechartsTooltip formatter={(val) => `$${Number(val).toFixed(2)}`} contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px'}} />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
               <div className="text-gray-500 text-sm">No provider data available.</div>
             )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : bills.length === 0 ? (
        <div className="bg-card/30 border border-border/40 rounded-2xl p-12 text-center shadow-lg">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-medium text-foreground mb-2">No bills tracked yet</h3>
          <p className="text-gray-400 max-w-sm mx-auto">
            Upload your first utility bill using Smart Scan to start tracking your expenses and detect spikes.
          </p>
        </div>
      ) : (
        <div>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input 
                type="text" 
                placeholder="Search by provider..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card/60 backdrop-blur-md border border-border/40 text-sm rounded-lg px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>
          <div className="overflow-x-auto bg-card/40 backdrop-blur-xl border border-border/40 rounded-2xl shadow-lg">
            <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-secondary/20 border-b border-border/40 text-gray-400 text-sm">
                <th className="p-4 font-medium cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('provider')}>
                  <div className="flex items-center gap-2">Provider <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-4 font-medium cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('amount')}>
                  <div className="flex items-center gap-2">Amount <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-4 font-medium cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('due_date')}>
                  <div className="flex items-center gap-2">Due Date <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-4 font-medium cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('billing_period')}>
                  <div className="flex items-center gap-2">Period <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBills.map((bill, idx) => (
                <motion.tr
                  key={bill.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="border-b border-border/20 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setSelectedBill(bill)}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <Building className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-semibold text-foreground">{bill.provider || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="p-4 font-bold text-foreground">
                    <div className="flex items-center text-gray-300">
                      <DollarSign className="w-4 h-4 text-gray-500 mr-1" />
                      {bill.amount ? bill.amount.toFixed(2) : '0.00'}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center text-gray-400">
                      <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                      {bill.due_date ? new Date(bill.due_date).toLocaleDateString() : 'N/A'}
                    </div>
                  </td>
                  <td className="p-4 text-gray-400">{bill.billing_period || 'N/A'}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setSelectedBill(bill)}
                        className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors" 
                        title="View Bill"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(bill.id);
                        }}
                        className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" 
                        title="Delete Bill"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {paginatedBills.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    No bills match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
            <span className="text-sm text-gray-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedBills.length)} of {sortedBills.length} entries
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
        {selectedBill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedBill(null)}
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
                  <div className="bg-primary/10 p-3 rounded-xl border border-primary/20">
                    <Building className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{selectedBill.provider || 'Bill Details'}</h2>
                    <p className="text-sm text-gray-400">{selectedBill.billing_period || 'N/A'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBill(null)}
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
                        <th className="p-4 font-medium text-gray-400 w-1/3">Provider</th>
                        <td className="p-4 font-medium text-foreground">{selectedBill.provider || 'N/A'}</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <th className="p-4 font-medium text-gray-400">Billing Period</th>
                        <td className="p-4 font-medium text-foreground">{selectedBill.billing_period || 'N/A'}</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <th className="p-4 font-medium text-gray-400">Amount Due</th>
                        <td className="p-4 font-semibold text-primary">{selectedBill.amount ? `$${selectedBill.amount.toFixed(2)}` : 'N/A'}</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <th className="p-4 font-medium text-gray-400">Due Date</th>
                        <td className="p-4 font-medium text-foreground">{selectedBill.due_date ? new Date(selectedBill.due_date).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {selectedBill.image_path && (
                  <div className="pt-4 border-t border-border/40 text-center">
                    <a 
                      href={`${apiClient.defaults.baseURL?.replace('/api', '') || 'http://localhost:8000'}${selectedBill.image_path}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground font-medium rounded-xl transition-colors"
                    >
                      <ExternalLink className="w-5 h-5" /> View Original Bill Image
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
