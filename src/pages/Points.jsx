import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LocateFixed, Map as MapIcon, List, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { pontos } from '../store/db';
import { useDbVersion } from '../hooks/useDbVersion';
import { PointCard, MaterialTag, EmptyState } from '../components/ui.jsx';
import MapView from '../components/MapView.jsx';
import { haversineKm, geocode, getCurrentLocation } from '../utils/geo';

export default function Points() {
  useDbVersion();
  const nav = useNavigate();
  const [cidade, setCidade] = useState('');
  const [material, setMaterial] = useState('');
  const [apenasAtivos, setApenasAtivos] = useState(false);
  const [view, setView] = useState('mapa');

  const [endereco, setEndereco] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [locLabel, setLocLabel] = useState('');
  const [focus, setFocus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [geoError, setGeoError] = useState('');

  const todos = pontos.list();
  const cidades = pontos.cidades();
  const materiais = [...new Set(todos.flatMap((p) => p.materiais))];

  let lista = pontos.list({
    cidade: cidade || undefined,
    material: material || undefined,
    ativo: apenasAtivos ? true : undefined,
  });
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
        <h1><MapPin size={24} color="var(--green-600)" /> Pontos de coleta</h1>
        <p>Encontre onde reciclar perto de você.</p>
      </div>

      <div className="card card-pad mb-2">
        <label className="small" style={{ fontWeight: 600, color: 'var(--muted)' }}>Buscar pontos próximos</label>
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
            <select className="select" value={cidade} onChange={(e) => setCidade(e.target.value)}>
              <option value="">Todas as cidades</option>
              {cidades.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field" style={{ margin: 0, display: 'flex', alignItems: 'flex-end' }}>
            <label className="row" style={{ gap: 8, cursor: 'pointer', fontWeight: 600 }}>
              <input type="checkbox" checked={apenasAtivos} onChange={(e) => setApenasAtivos(e.target.checked)} />
              Mostrar apenas pontos ativos
            </label>
          </div>
        </div>

        <label className="small muted" style={{ fontWeight: 600 }}>Filtrar por material</label>
        <div className="row wrap mt-1" style={{ gap: 6 }}>
          <span className={`tag clickable ${material === '' ? 'active' : ''}`} onClick={() => setMaterial('')}>Todos</span>
          {materiais.map((m) => (
            <MaterialTag key={m} slug={m} active={material === m} onClick={() => setMaterial(material === m ? '' : m)} />
          ))}
        </div>
      </div>

      <div className="row between mb-2 wrap" style={{ gap: 10 }}>
        <span className="small muted">{lista.length} ponto(s) encontrado(s)</span>
        <div className="seg" style={{ width: 200 }}>
          <button className={view === 'mapa' ? 'active' : ''} onClick={() => setView('mapa')}><MapIcon size={17} /> Mapa</button>
          <button className={view === 'lista' ? 'active' : ''} onClick={() => setView('lista')}><List size={17} /> Lista</button>
        </div>
      </div>

      {view === 'mapa' ? (
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
          {lista.map((p) => <PointCard key={p.id} ponto={p} distanceKm={p._dist} />)}
        </div>
      )}
    </div>
  );
}
