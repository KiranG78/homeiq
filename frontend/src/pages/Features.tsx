import { motion } from 'framer-motion';
import { PackageSearch, MessageSquare, ArrowRight, ScanLine, FileText, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Features() {
  const capabilities = [
    {
      title: 'Smart Scan',
      description: 'Auto-categorize your physical receipts, utility bills, and warranties using advanced AI. Simply upload an image and let HomeIQ extract the critical data instantly.',
      icon: <ScanLine className="w-10 h-10 text-cyan-400" />,
      link: '/scan',
      color: 'from-cyan-500/10 to-transparent',
      borderColor: 'border-cyan-500/30',
      action: 'Try Smart Scan'
    },
    {
      title: 'Appliance Hub',
      description: 'Monitor all your home appliances in one place. Track warranty statuses, purchase prices, and lifespan usage to stay ahead of expensive breakdowns.',
      icon: <PackageSearch className="w-10 h-10 text-primary" />,
      link: '/vault#appliances',
      color: 'from-primary/10 to-transparent',
      borderColor: 'border-primary/30',
      action: 'View Appliances'
    },
    {
      title: 'Document Vault',
      description: 'A secure, organized vault for your most important home documents. Manage home insurance policies, tax documents, and track active return windows of your shopping and grocery items.',
      icon: <FileText className="w-10 h-10 text-emerald-400" />,
      link: '/vault#documents',
      color: 'from-emerald-500/10 to-transparent',
      borderColor: 'border-emerald-500/30',
      action: 'Open Vault'
    },
    {
      title: 'AI Handyman',
      description: 'Your 24/7 intelligent home assistant. Diagnose appliance issues, get smart home maintenance tips, and find DIY repair instructions before calling a professional.',
      icon: <MessageSquare className="w-10 h-10 text-purple-400" />,
      link: '/',
      color: 'from-purple-500/10 to-transparent',
      borderColor: 'border-purple-500/30',
      action: 'Return to Dashboard' // Since Chat is a floating button
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto py-10 px-4"
    >
      {/* Header */}
      <div className="text-center mb-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-6 ring-1 ring-primary/30 shadow-[0_0_30px_rgba(14,165,233,0.3)]"
        >
          <Sparkles className="w-10 h-10 text-primary" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight mb-4"
        >
          HomeIQ <span className="bg-gradient-to-r from-primary via-purple-400 to-cyan-400 bg-clip-text text-transparent">Capabilities</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-gray-400 max-w-2xl mx-auto"
        >
          Discover how HomeIQ leverages AI to automate your household management, predict maintenance, and securely organize your home's data.
        </motion.p>
      </div>

      {/* Capabilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {capabilities.map((cap, idx) => (
          <motion.div
            key={cap.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * (idx + 2) }}
            className={`relative overflow-hidden bg-card/40 backdrop-blur-xl border ${cap.borderColor} rounded-3xl p-8 md:p-10 shadow-xl group hover:-translate-y-2 transition-transform duration-300`}
          >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${cap.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10`} />

            <div className="bg-background/80 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-sm border border-border/40 group-hover:scale-110 transition-transform duration-300">
              {cap.icon}
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-4">{cap.title}</h2>
            <p className="text-gray-400 leading-relaxed mb-10 h-auto md:h-24">
              {cap.description}
            </p>

            <Link
              to={cap.link}
              className="inline-flex items-center text-sm font-semibold text-foreground bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-xl transition-all group/btn"
            >
              {cap.action} <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
