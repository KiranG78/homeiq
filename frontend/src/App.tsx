import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Profile from './pages/Profile';
import Appliances from './pages/Appliances';
import AddAppliance from './pages/AddAppliance';
import EditAppliance from './pages/EditAppliance';
import Chat from './pages/Chat';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/appliances" replace />} />
          <Route path="profile" element={<Profile />} />
          <Route path="appliances" element={<Appliances />} />
          <Route path="appliances/add" element={<AddAppliance />} />
          <Route path="appliances/:id/edit" element={<EditAppliance />} />
          <Route path="chat" element={<Chat />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
