import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import Layout from './layouts/Layout.jsx';

import Login from '@/features/auth/pages/Login.jsx';
import Register from '@/features/auth/pages/Register.jsx';
import Dashboard from '@/features/cidadao/pages/Dashboard.jsx';
import Points from '@/features/cidadao/pages/Points.jsx';
import PointDetail from '@/features/cidadao/pages/PointDetail.jsx';
import ScheduleCollection from '@/features/cidadao/pages/ScheduleCollection.jsx';
import MyCollections from '@/features/cidadao/pages/MyCollections.jsx';
import Rewards from '@/features/cidadao/pages/Rewards.jsx';
import Education from '@/features/cidadao/pages/Education.jsx';
import Ranking from '@/features/cidadao/pages/Ranking.jsx';
import Chat from '@/features/shared/pages/Chat.jsx';
import Profile from '@/features/shared/pages/Profile.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/pontos" element={<Points />} />
        <Route path="/pontos/:id" element={<PointDetail />} />
        <Route path="/agendar/:pontoId" element={<ScheduleCollection />} />
        <Route path="/coletas" element={<MyCollections />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/chat/:pontoId" element={<Chat />} />
        <Route path="/loja" element={<Rewards />} />
        <Route path="/educacao" element={<Education />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/perfil" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
