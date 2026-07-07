import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Appliances from './pages/Appliances';
import AddAppliance from './pages/AddAppliance';
import EditAppliance from './pages/EditAppliance';
import SmartScan from './pages/SmartScan';
import DocumentVault from './pages/DocumentVault';
import Bills from './pages/Bills';
import EditBill from './pages/EditBill';
import Vault from './pages/Vault';
import Features from './pages/Features';
import Chat from './pages/Chat';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="appliances" element={<Navigate to="/vault#appliances" replace />} />
          <Route path="appliances/add" element={<AddAppliance />} />
          <Route path="appliances/:id/edit" element={<EditAppliance />} />
          <Route path="scan" element={<SmartScan />} />
          <Route path="documents" element={<Navigate to="/vault#documents" replace />} />
          <Route path="bills" element={<Navigate to="/vault#bills" replace />} />
          <Route path="bills/:id/edit" element={<EditBill />} />
          <Route path="vault" element={<Vault />} />
          <Route path="features" element={<Features />} />
          <Route path="chat" element={<Chat />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
