import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FileText, ShieldAlert, ShoppingBag, Receipt, Calendar, ExternalLink, ArrowUpDown, X, Eye, Edit2, Trash2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import client from '../api/client';
import { API_BASE_URL } from '../api/client';

export default function DocumentVault({ isSubPage = false }: { isSubPage?: boolean }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      try {
        await client.delete(`/documents/${id}`);
        setDocuments(documents.filter((d) => d.id !== id));
      } catch (error) {
        console.error("Failed to delete document:", error);
        alert("Failed to delete document.");
      }
    }
  };

  useEffect(() => {
    client.get('/documents/')
      .then(res => setDocuments(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter]);

  const getIcon = (type: string) => {
    switch(type) {
      case 'receipt': return <ShoppingBag className="w-5 h-5 text-pink-400" />;
      case 'grocery': return <Receipt className="w-5 h-5 text-green-400" />;
      case 'home_doc': return <FileText className="w-5 h-5 text-blue-400" />;
      default: return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch(type) {
      case 'receipt': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      case 'grocery': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'home_doc': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            doc.store_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter ? doc.document_type === typeFilter : true;
      
      return matchesSearch && matchesType;
    });
  }, [documents, searchQuery, typeFilter]);

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    if (!sortConfig) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const paginatedDocuments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedDocuments.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedDocuments, currentPage]);

  const totalPages = Math.ceil(sortedDocuments.length / itemsPerPage);

  return (
    <div className={isSubPage ? "" : "max-w-7xl mx-auto py-8 px-4"}>
      {!isSubPage && (
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Document Vault</h1>
            <p className="text-gray-400 mt-2">Manage all your digitized receipts, policies, and home documents.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
      ) : documents.length === 0 ? (
        <div className="text-center py-20 bg-card/30 rounded-2xl border border-border/40">
          <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No documents found. Use Smart Scan to add some!</p>
        </div>
      ) : (
        <div>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input 
                type="text" 
                placeholder="Search documents..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card/60 backdrop-blur-md border border-border/40 text-sm rounded-lg px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-card/60 backdrop-blur-md border border-border/40 text-sm rounded-lg px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none cursor-pointer"
            >
              <option value="">All Document Types</option>
              <option value="receipt">Receipt</option>
              <option value="grocery">Grocery Receipt</option>
              <option value="home_doc">Home Document</option>
              <option value="bill">Utility Bill</option>
              <option value="tax_document">Tax Document</option>
              <option value="insurance">Insurance Policy</option>
              <option value="warranty">Warranty</option>
            </select>
          </div>

          <div className="overflow-x-auto bg-card/40 backdrop-blur-xl border border-border/40 rounded-2xl shadow-lg">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-secondary/20 border-b border-border/40 text-gray-400 text-sm">
                <th className="p-4 font-medium cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('document_type')}>
                  <div className="flex items-center gap-2">Type <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-4 font-medium cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('title')}>
                  <div className="flex items-center gap-2">Title <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-4 font-medium cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('store_name')}>
                  <div className="flex items-center gap-2">Store <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-4 font-medium cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('total_amount')}>
                  <div className="flex items-center gap-2">Amount <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-4 font-medium cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('purchase_date')}>
                  <div className="flex items-center gap-2">Purchase Date <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-4 font-medium cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('return_expiration_date')}>
                  <div className="flex items-center gap-2">Expiration Date <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDocuments.map((doc, idx) => (
                <motion.tr
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="border-b border-border/20 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setSelectedDoc(doc)}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="capitalize text-sm font-medium">{doc.document_type.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="p-4 font-medium text-foreground">{doc.title || 'Untitled Document'}</td>
                  <td className="p-4 text-gray-400">{doc.store_name || 'Unknown'}</td>
                  <td className="p-4 font-semibold text-foreground">{doc.total_amount ? `$${doc.total_amount}` : '-'}</td>
                  <td className="p-4 text-gray-400">{doc.purchase_date || '-'}</td>
                  <td className="p-4">
                    {doc.return_expiration_date ? (
                      <span className="text-red-400 font-medium">{doc.return_expiration_date}</span>
                    ) : '-'}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setSelectedDoc(doc)}
                        className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors" 
                        title="View Document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <Link to={`/documents/${doc.id}/edit`} className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit Document">
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(doc.id);
                        }}
                        className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" 
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {paginatedDocuments.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    No documents match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
            <span className="text-sm text-gray-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedDocuments.length)} of {sortedDocuments.length} entries
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
        {selectedDoc && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDoc(null)}
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
                    <div className={`p-3 rounded-xl border ${getBadgeColor(selectedDoc.document_type)}`}>
                      {getIcon(selectedDoc.document_type)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{selectedDoc.title || 'Document Details'}</h2>
                      <p className="text-sm text-gray-400 capitalize">{selectedDoc.document_type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDoc(null)}
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
                          <th className="p-4 font-medium text-gray-400 w-1/3">Store / Provider</th>
                          <td className="p-4 font-medium text-foreground">{selectedDoc.store_name || 'N/A'}</td>
                        </tr>
                        <tr className="hover:bg-white/5 transition-colors">
                          <th className="p-4 font-medium text-gray-400">Total Amount</th>
                          <td className="p-4 font-semibold text-primary">{selectedDoc.total_amount ? `$${selectedDoc.total_amount}` : 'N/A'}</td>
                        </tr>
                        <tr className="hover:bg-white/5 transition-colors">
                          <th className="p-4 font-medium text-gray-400">Purchase Date</th>
                          <td className="p-4 font-medium text-foreground">{selectedDoc.purchase_date || 'N/A'}</td>
                        </tr>
                        <tr className="hover:bg-white/5 transition-colors">
                          <th className="p-4 font-medium text-gray-400">Expiration / Return Date</th>
                          <td className="p-4 font-medium text-red-400">{selectedDoc.return_expiration_date || 'N/A'}</td>
                        </tr>
                        {selectedDoc.extracted_text && (
                          <tr className="hover:bg-white/5 transition-colors">
                            <th className="p-4 font-medium text-gray-400 align-top">Summary</th>
                            <td className="p-4 text-sm text-gray-300 whitespace-pre-wrap">{selectedDoc.extracted_text}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {selectedDoc.image_path && (
                    <div className="pt-4 border-t border-border/40 text-center">
                      <a 
                        href={`${API_BASE_URL}${selectedDoc.image_path}`} 
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
    </div>
  );
}
