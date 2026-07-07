import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, FileText, DollarSign } from 'lucide-react';
import Appliances from './Appliances';
import DocumentVault from './DocumentVault';
import Bills from './Bills';

export default function Vault() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'appliances' | 'documents' | 'bills'>('appliances');

  useEffect(() => {
    // Set tab based on hash
    const hash = location.hash.replace('#', '');
    if (hash === 'appliances' || hash === 'documents' || hash === 'bills') {
      setActiveTab(hash);
    } else {
      // default hash if none provided
      navigate('/vault#appliances', { replace: true });
    }
  }, [location, navigate]);

  const handleTabChange = (tab: 'appliances' | 'documents' | 'bills') => {
    setActiveTab(tab);
    navigate(`/vault#${tab}`);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">My Vault</h1>
        <p className="text-gray-400">Manage all your home assets, documents, and expenses in one place.</p>
      </div>

      {/* Segmented Switch */}
      <div className="flex bg-secondary/30 p-1 rounded-xl mb-8 max-w-fit border border-border/40">
        <button
          onClick={() => handleTabChange('appliances')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === 'appliances' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
        >
          <Package className="w-4 h-4" />
          Appliances
        </button>
        <button
          onClick={() => handleTabChange('documents')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === 'documents' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
        >
          <FileText className="w-4 h-4" />
          Documents
        </button>
        <button
          onClick={() => handleTabChange('bills')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === 'bills' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
        >
          <DollarSign className="w-4 h-4" />
          Utility Bills
        </button>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'appliances' && <Appliances isSubPage />}
          {activeTab === 'documents' && <DocumentVault isSubPage />}
          {activeTab === 'bills' && <Bills isSubPage />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
