import { lazy, Suspense } from 'react';
import { Carregando } from '@/components/ui.jsx';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute, { RequirePerfil } from './ProtectedRoute.jsx';
import Layout from './layouts/Layout.jsx';
import { useAuth } from './AuthContext.jsx';
import { PERFIS } from '@/domain/permissoes';

import Login from '@/features/auth/pages/Login.jsx';

import Dashboard from '@/features/cidadao/pages/Dashboard.jsx';

// Cada tela vira um pedaço separado do JavaScript, baixado só quando é aberta
// (o login e o início do cidadão vêm junto, para a primeira tela ser imediata).
const Register = lazy(() => import('@/features/auth/pages/Register.jsx'));
const RecuperarSenha = lazy(() => import('@/features/auth/pages/RecuperarSenha.jsx'));
const Documento = lazy(() => import('@/features/shared/pages/Documento.jsx'));
const CaixaEmails = lazy(() => import('@/features/shared/pages/CaixaEmails.jsx'));
const Points = lazy(() => import('@/features/cidadao/pages/Points.jsx'));
const PointDetail = lazy(() => import('@/features/cidadao/pages/PointDetail.jsx'));
const ScheduleCollection = lazy(() => import('@/features/cidadao/pages/ScheduleCollection.jsx'));
const MyCollections = lazy(() => import('@/features/cidadao/pages/MyCollections.jsx'));
const Rewards = lazy(() => import('@/features/cidadao/pages/Rewards.jsx'));
const Education = lazy(() => import('@/features/cidadao/pages/Education.jsx'));
const Ranking = lazy(() => import('@/features/cidadao/pages/Ranking.jsx'));
const Chat = lazy(() => import('@/features/shared/pages/Chat.jsx'));
const Profile = lazy(() => import('@/features/shared/pages/Profile.jsx'));
const PainelParceiro = lazy(() => import('@/features/parceiro/pages/PainelParceiro.jsx'));
const SejaParceiro = lazy(() => import('@/features/parceiro/pages/SejaParceiro.jsx'));
const CadastroOrganizacao = lazy(() => import('@/features/parceiro/pages/CadastroOrganizacao.jsx'));
const AssistentePonto = lazy(() => import('@/features/parceiro/pages/AssistentePonto.jsx'));
const ConferenciaColeta = lazy(() => import('@/features/parceiro/pages/ConferenciaColeta.jsx'));
const ColetaDetalhe = lazy(() => import('@/features/cidadao/pages/ColetaDetalhe.jsx'));
const MinhaReputacao = lazy(() => import('@/features/cidadao/pages/MinhaReputacao.jsx'));
const Aprovacoes = lazy(() => import('@/features/admin/pages/Aprovacoes.jsx'));
const Usuarios = lazy(() => import('@/features/admin/pages/Usuarios.jsx'));
const Auditoria = lazy(() => import('@/features/admin/pages/Auditoria.jsx'));
const VisaoGeral = lazy(() => import('@/features/admin/pages/VisaoGeral.jsx'));
const FilaDenuncias = lazy(() => import('@/features/admin/pages/FilaDenuncias.jsx'));
const CasoDenuncia = lazy(() => import('@/features/admin/pages/CasoDenuncia.jsx'));
const Contestacoes = lazy(() => import('@/features/admin/pages/Contestacoes.jsx'));
const MinhasDenuncias = lazy(() => import('@/features/shared/pages/MinhasDenuncias.jsx'));
const Ajuda = lazy(() => import('@/features/shared/pages/Ajuda.jsx'));
const AceitarConvite = lazy(() => import('@/features/shared/pages/AceitarConvite.jsx'));

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
    <Suspense fallback={<Carregando linhas={2} altura={120} rotulo="Abrindo…" />}>
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
          <Route path="/convite" element={<AceitarConvite />} />
          <Route path="/ajuda" element={<Ajuda />} />
          <Route
            path="/denuncias"
            element={
              <RequirePerfil perfil={['cidadao', 'parceiro']}>
                <MinhasDenuncias />
              </RequirePerfil>
            }
          />

          {/* Cidadão */}
          <Route path="/pontos" element={cidadao(<Points />)} />
          <Route path="/pontos/:id" element={cidadao(<PointDetail />)} />
          <Route path="/agendar/:pontoId" element={cidadao(<ScheduleCollection />)} />
          <Route path="/coletas" element={cidadao(<MyCollections />)} />
          <Route path="/coletas/:id" element={cidadao(<ColetaDetalhe />)} />
          <Route path="/reputacao" element={cidadao(<MinhaReputacao />)} />
          <Route path="/chat" element={cidadao(<Chat />)} />
          <Route path="/chat/:pontoId" element={cidadao(<Chat />)} />
          <Route path="/loja" element={cidadao(<Rewards />)} />
          <Route path="/educacao" element={cidadao(<Education />)} />
          <Route path="/ranking" element={cidadao(<Ranking />)} />

          {/* Parceiro */}
          <Route path="/parceiro" element={parceiro(<PainelParceiro />)} />
          <Route path="/parceiro/cadastro" element={parceiro(<CadastroOrganizacao />)} />
          <Route path="/parceiro/pontos/:id" element={parceiro(<AssistentePonto />)} />
          <Route path="/parceiro/coletas/:id" element={parceiro(<ConferenciaColeta />)} />

          {/* Plataforma */}
          <Route path="/admin" element={plataforma(<VisaoGeral />)} />
          <Route path="/admin/usuarios" element={plataforma(<Usuarios />)} />
          <Route path="/admin/denuncias" element={plataforma(<FilaDenuncias />)} />
          <Route path="/admin/denuncias/:id" element={plataforma(<CasoDenuncia />)} />
          <Route path="/admin/contestacoes" element={plataforma(<Contestacoes />)} />
          <Route path="/admin/contestacoes/:id" element={plataforma(<Contestacoes />)} />
          <Route path="/admin/aprovacoes" element={plataforma(<Aprovacoes />)} />
          <Route path="/admin/auditoria" element={plataforma(<Auditoria />)} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
