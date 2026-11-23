import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute, { RequirePerfil } from './ProtectedRoute.jsx';
import Layout from './layouts/Layout.jsx';
import { useAuth } from './AuthContext.jsx';
import { PERFIS } from '@/domain/permissoes';

import Login from '@/features/auth/pages/Login.jsx';
import Register from '@/features/auth/pages/Register.jsx';
import RecuperarSenha from '@/features/auth/pages/RecuperarSenha.jsx';
import Documento from '@/features/shared/pages/Documento.jsx';
import CaixaEmails from '@/features/shared/pages/CaixaEmails.jsx';

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

import PainelParceiro from '@/features/parceiro/pages/PainelParceiro.jsx';
import SejaParceiro from '@/features/parceiro/pages/SejaParceiro.jsx';
import CadastroOrganizacao from '@/features/parceiro/pages/CadastroOrganizacao.jsx';
import AssistentePonto from '@/features/parceiro/pages/AssistentePonto.jsx';
import Aprovacoes from '@/features/admin/pages/Aprovacoes.jsx';
import Usuarios from '@/features/admin/pages/Usuarios.jsx';
import Auditoria from '@/features/admin/pages/Auditoria.jsx';

/** "/" leva cada perfil à sua página inicial. */
function Inicio() {
  const { perfil } = useAuth();
  if (perfil === 'cidadao') return <Dashboard />;
  return <Navigate to={PERFIS[perfil]?.inicio || '/perfil'} replace />;
}

const cidadao = (el) => <RequirePerfil perfil="cidadao">{el}</RequirePerfil>;
const parceiro = (el) => <RequirePerfil perfil="parceiro">{el}</RequirePerfil>;
const plataforma = (el) => <RequirePerfil perfil="admin">{el}</RequirePerfil>;

export default function App() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Register />} />
      <Route path="/recuperar-senha" element={<RecuperarSenha />} />
      <Route path="/termos" element={<Documento tipo="termos" />} />
      <Route path="/privacidade" element={<Documento tipo="privacidade" />} />
      <Route path="/demo/emails" element={<CaixaEmails />} />
      <Route path="/seja-parceiro" element={<SejaParceiro />} />

      {/* Privadas */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Inicio />} />
        <Route path="/perfil" element={<Profile />} />

        {/* Cidadão */}
        <Route path="/pontos" element={cidadao(<Points />)} />
        <Route path="/pontos/:id" element={cidadao(<PointDetail />)} />
        <Route path="/agendar/:pontoId" element={cidadao(<ScheduleCollection />)} />
        <Route path="/coletas" element={cidadao(<MyCollections />)} />
        <Route path="/chat" element={cidadao(<Chat />)} />
        <Route path="/chat/:pontoId" element={cidadao(<Chat />)} />
        <Route path="/loja" element={cidadao(<Rewards />)} />
        <Route path="/educacao" element={cidadao(<Education />)} />
        <Route path="/ranking" element={cidadao(<Ranking />)} />

        {/* Parceiro */}
        <Route path="/parceiro" element={parceiro(<PainelParceiro />)} />
        <Route path="/parceiro/cadastro" element={parceiro(<CadastroOrganizacao />)} />
        <Route path="/parceiro/pontos/:id" element={parceiro(<AssistentePonto />)} />

        {/* Plataforma */}
        <Route path="/admin" element={plataforma(<Usuarios />)} />
        <Route path="/admin/aprovacoes" element={plataforma(<Aprovacoes />)} />
        <Route path="/admin/auditoria" element={plataforma(<Auditoria />)} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
