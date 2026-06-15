import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Points from './pages/Points.jsx';
import PointDetail from './pages/PointDetail.jsx';
import ScheduleCollection from './pages/ScheduleCollection.jsx';
import MyCollections from './pages/MyCollections.jsx';
import Chat from './pages/Chat.jsx';
import Ranking from './pages/Ranking.jsx';
import Profile from './pages/Profile.jsx';

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
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/perfil" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
