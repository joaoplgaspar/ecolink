import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LocateFixed, Map as MapIcon, List, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { pontos, bloqueios } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { filtrarPontos, cidadesDe, materiaisDe } from '@/domain/pontos';
import { statusFuncionamento } from '@/domain/horarios';
import { PointCard, MaterialTag, EmptyState, Carregando, ErroCarregar } from '@/components/ui.jsx';
import MapView from '@/components/MapView.jsx';
import { haversineKm, geocode, getCurrentLocation } from '@/utils/geo';

export default function Points() {
  const nav = useNavigate();
  const [cidade, setCidade] = useState('');
  const [material, setMaterial] = useState('');
  const [apenasAtivos, setApenasAtivos] = useState(false);
  const [abertosAgora, setAbertosAgora] = useState(false);
  const [view, setView] = useState('mapa');

  const [endereco, setEndereco] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [locLabel, setLocLabel] = useState('');
  const [focus, setFocus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [geoError, setGeoError] = useState('');

  // Busca todos os pontos uma vez e filtra aqui: os filtros respondem na hora,
  // sem nova "ida ao servidor" a cada clique. A regra de filtro é a mesma do repositório.
  // Pontos que a pessoa bloqueou não aparecem para ela (desbloqueio na página do ponto ou no perfil).
  const q = useQuery(
    () =>
      Promise.all([pontos.listar(), bloqueios.listar().catch(() => [])]).then(([lista, bl]) => {
        const ocultos = new Set(bl.filter((b) => b.alvo_tipo === 'ponto').map((b) => b.alvo_id));
        return lista.filter((p) => !ocultos.has(p.id));
      }),
    [],
  );
  const todos = useMemo(() => q.data || [], [q.data]);
  const cidades = useMemo(() => cidadesDe(todos), [todos]);
  const materiais = useMemo(() => materiaisDe(todos), [todos]);

  let lista = filtrarPontos(todos, {
    cidade: cidade || undefined,
    material: material || undefined,
    ativo: apenasAtivos ? true : undefined,
  });
  if (abertosAgora) lista = lista.filter((p) => p.ativo && statusFuncionamento(p).aberto);
  if (userLocation) {
    lista = lista
      .map((p) => ({
        ...p,
        _dist: p.latitude != null ? haversineKm(userLocation, { lat: p.latitude, lon: p.longitude }) : null,
      }))
      .sort((a, b) => (a._dist ?? 1e9) - (b._dist ?? 1e9));
  }

  async function buscarEndereco() {
    if (!endereco.trim()) return;
    setGeoError('');
    setBusy(true);
    try {
      const r = await geocode(endereco);
      if (!r) {
        setGeoError('Endereço não encontrado. Tente ser mais específico.');
      } else {
        setUserLocation({ lat: r.lat, lon: r.lon });
        setLocLabel(r.label.split(',').slice(0, 3).join(', '));
        setFocus([r.lat, r.lon]);
        setView('mapa');
      }
    } catch {
      setGeoError('Não foi possível buscar agora (verifique a conexão).');
    } finally {
      setBusy(false);
    }
  }

  async function usarMinhaLocalizacao() {
    setGeoError('');
    setBusy(true);
    try {
      const loc = await getCurrentLocation();
      setUserLocation(loc);
      setLocLabel('Minha localização');
      setFocus([loc.lat, loc.lon]);
      setView('mapa');
    } catch (e) {
      setGeoError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>
          <MapPin size={24} color="var(--green-600)" /> Pontos de coleta
        </h1>
        <p>Encontre onde reciclar perto de você.</p>
      </div>

      <div className="card card-pad mb-2">
        <label className="small" style={{ fontWeight: 600, color: 'var(--muted)' }}>
          Buscar pontos próximos
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
          <div className="input-icon" style={{ flex: '1 1 220px' }}>
            <MapPin />
            <input
              className="input"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscarEndereco()}
              placeholder="Digite seu endereço ou bairro..."
            />
          </div>
          <button className="btn btn-primary" onClick={buscarEndereco} disabled={busy}>
            {busy ? <Loader2 size={18} className="spin" /> : <Search size={18} />} Buscar
          </button>
          <button className="btn" onClick={usarMinhaLocalizacao} disabled={busy} title="Usar minha localização">
            <LocateFixed size={18} /> <span className="hide-mobile">Minha localização</span>
          </button>
        </div>
        {locLabel && (
          <p className="small muted row mt-1" style={{ gap: 6 }}>
            <LocateFixed size={14} color="var(--green-600)" /> Pontos próximos de: <strong>{locLabel}</strong>
          </p>
        )}
        {geoError && (
          <p className="small row mt-1" style={{ gap: 6, color: 'var(--danger)' }}>
            <AlertCircle size={15} /> {geoError}
          </p>
        )}

        <div className="divider" />

        <div className="grid grid-2 mb-2" style={{ gap: 14 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Cidade</label>
            <select className="select" aria-label="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)}>
              <option value="">Todas as cidades</option>
              {cidades.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0, display: 'flex', alignItems: 'flex-end' }}>
            <label className="row" style={{ gap: 8, cursor: 'pointer', fontWeight: 600 }}>
              <input type="checkbox" checked={apenasAtivos} onChange={(e) => setApenasAtivos(e.target.checked)} />
              Só pontos recebendo
            </label>
            <label className="row" style={{ gap: 8, cursor: 'pointer', fontWeight: 600, marginLeft: 16 }}>
              <input type="checkbox" checked={abertosAgora} onChange={(e) => setAbertosAgora(e.target.checked)} />
              Abertos agora
            </label>
          </div>
        </div>

        <label className="small muted" style={{ fontWeight: 600 }}>
          Filtrar por material
        </label>
        <div className="row wrap mt-1" style={{ gap: 6 }}>
          <span className={`tag clickable ${material === '' ? 'active' : ''}`} onClick={() => setMaterial('')}>
            Todos
          </span>
          {materiais.map((m) => (
            <MaterialTag
              key={m}
              slug={m}
              active={material === m}
              onClick={() => setMaterial(material === m ? '' : m)}
            />
          ))}
        </div>
      </div>

      <div className="row between mb-2 wrap" style={{ gap: 10 }}>
        <span className="small muted" aria-live="polite">
          {q.loading ? 'Buscando pontos…' : `${lista.length} ponto(s) encontrado(s)`}
        </span>
        <div className="seg" style={{ width: 200 }}>
          <button className={view === 'mapa' ? 'active' : ''} onClick={() => setView('mapa')}>
            <MapIcon size={17} /> Mapa
          </button>
          <button className={view === 'lista' ? 'active' : ''} onClick={() => setView('lista')}>
            <List size={17} /> Lista
          </button>
        </div>
      </div>

      {q.loading ? (
        <Carregando linhas={view === 'mapa' ? 1 : 3} altura={view === 'mapa' ? 440 : 180} rotulo="Carregando pontos…" />
      ) : !q.data ? (
        <ErroCarregar erro={q.error} onTentar={q.refetch} />
      ) : view === 'mapa' ? (
        <MapView
          pontos={lista}
          userLocation={userLocation}
          focus={focus}
          onAgendar={(p) => nav(`/agendar/${p.id}`)}
          height={440}
        />
      ) : lista.length === 0 ? (
        <EmptyState icon={Search} title="Nenhum ponto com esses filtros">
          Tente trocar a cidade ou o material.
        </EmptyState>
      ) : (
        <div className="grid grid-auto">
          {lista.map((p) => (
            <PointCard key={p.id} ponto={p} distanceKm={p._dist} />
          ))}
        </div>
      )}
    </div>
  );
}
