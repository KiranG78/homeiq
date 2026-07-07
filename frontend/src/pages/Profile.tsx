import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, MapPin, Building, Hash } from 'lucide-react';
import client from '../api/client';

interface UserProfile {
  id?: number;
  full_name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile>({
    full_name: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip_code: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    client.get('/profile/')
      .then(res => setProfile(res.data))
      .catch(err => {
        if (err.response?.status !== 404) {
          console.error("Error loading profile", err);
        }
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      if (profile.id) {
        await client.put('/profile/', profile);
      } else {
        const res = await client.post('/profile/', profile);
        setProfile(res.data);
      }
      setMessage('Profile saved successfully!');
    } catch (err) {
      setMessage('Failed to save profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto p-4 md:p-6"
    >
      <div className="bg-card/40 backdrop-blur-xl rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.1)] border border-border/40 p-6 md:p-8 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -z-10"></div>
        
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <div className="p-3 bg-primary/10 rounded-xl text-primary shadow-[0_0_15px_rgba(14,165,233,0.2)]">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Home Profile</h1>
            <p className="text-sm md:text-base text-gray-400">Manage your household details</p>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-6 border text-sm md:text-base ${message.includes('success') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input required type="text" name="full_name" value={profile.full_name} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 bg-background/50 border border-border/40 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground placeholder:text-gray-600"
                  placeholder="John Doe" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input type="email" name="email" value={profile.email} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 bg-background/50 border border-border/40 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground placeholder:text-gray-600"
                  placeholder="john@example.com" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Street Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input type="text" name="address" value={profile.address} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 bg-background/50 border border-border/40 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground placeholder:text-gray-600"
                  placeholder="123 Main St" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">City</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input type="text" name="city" value={profile.city} onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 bg-background/50 border border-border/40 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground placeholder:text-gray-600"
                    placeholder="San Francisco" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">State</label>
                <input type="text" name="state" value={profile.state} onChange={handleChange}
                  className="w-full px-4 py-2 bg-background/50 border border-border/40 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground placeholder:text-gray-600"
                  placeholder="CA" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">ZIP Code</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input required type="text" name="zip_code" value={profile.zip_code} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 bg-background/50 border border-border/40 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground placeholder:text-gray-600"
                  placeholder="94105" />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border/40">
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-cyan-500 hover:opacity-90 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(14,165,233,0.3)]">
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
