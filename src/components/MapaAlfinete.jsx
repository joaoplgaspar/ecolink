// Mapa para MARCAR a localização do ponto: busque o endereço, depois arraste o
// alfinete (ou toque no mapa) até a entrada exata. Funciona também com teclado:
// as coordenadas podem ser ajustadas nos campos abaixo do mapa.

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Search, LocateFixed, Loader2 } from 'lucide-react';
import { geocode, getCurrentLocation } from '@/utils/geo';
import { MensagemErro } from './ui.jsx';

const PIN = L.divIcon({
  className: 'pin-marker',
  html: '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 24 24" fill="#ef9f27" stroke="#fff" stroke-width="1.6"><path d="M12 21.5s7-6.7 7-12.2A7 7 0 1 0 5 9.3C5 14.8 12 21.5 12 21.5z"/><circle cx="12" cy="9" r="2.6" fill="#fff" stroke="none"/></svg>',
  iconSize: [34, 42],
  iconAnchor: [17, 42],
});

function CliqueNoMapa({ aoMarcar }) {
  useMapEvents({ click: (e) => aoMarcar(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Centralizar({ alvo }) {
  const map = useMap();
  useEffect(() => {
    if (alvo) map.flyTo(alvo, 17, { duration: 0.6 });
  }, [alvo?.[0], alvo?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

const arred = (n) => Math.round(n * 1e6) / 1e6;

export default function MapaAlfinete({ latitude, longitude, enderecoSugerido = '', aoMudar, desabilitado }) {
  const [busca, setBusca] = useState(enderecoSugerido);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState('');
  const [alvo, setAlvo] = useState(null);
  const temPino = Number.isFinite(latitude) && Number.isFinite(longitude);
  const centro = useMemo(() => (temPino ? [latitude, longitude] : [-23.55, -46.63]), []); // eslint-disable-line react-hooks/exhaustive-deps

  const marcar = (lat, lng, voar = false) => {
    if (desabilitado) return;
    aoMudar(arred(lat), arred(lng));
    if (voar) setAlvo([lat, lng]);
  };

  async function buscar() {
    if (!busca.trim()) return;
    setErro('');
    setBuscando(true);
    try {
      const r = await geocode(busca);
      if (!r) setErro('Endereço não encontrado. Tente incluir o número e a cidade.');
      else marcar(r.lat, r.lon, true);
    } catch {
      setErro('Não foi possível buscar agora (verifique a conexão). Você pode marcar direto no mapa.');
    } finally {
      setBuscando(false);
    }
  }

  async function minhaLocalizacao() {
    setErro('');
    try {
      const loc = await getCurrentLocation();
      marcar(loc.lat, loc.lon, true);
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <div>
      {!desabilitado && (
        <div className="row wrap mb-1" style={{ gap: 8 }}>
          <div className="input-icon" style={{ flex: '1 1 220px' }}>
            <Search />
            <input
              className="input"
              aria-label="Buscar endereço no mapa"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), buscar())}
              placeholder="Rua, número e cidade"
            />
          </div>
          <button type="button" className="btn" onClick={buscar} disabled={buscando}>
            {buscando ? <Loader2 size={16} className="spin" /> : <Search size={16} />} Buscar
          </button>
          <button type="button" className="btn btn-ghost" onClick={minhaLocalizacao} title="Estou no ponto agora">
            <LocateFixed size={16} /> <span className="hide-mobile">Estou aqui</span>
          </button>
        </div>
      )}
      <MensagemErro erro={erro} style={{ marginBottom: 8 }} />
      <div className="map-box" style={{ height: 320 }} data-testid="mapa-alfinete">
        <MapContainer
          center={centro}
          zoom={temPino ? 17 : 12}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Centralizar alvo={alvo} />
          {!desabilitado && <CliqueNoMapa aoMarcar={marcar} />}
          {temPino && (
            <Marker
              position={[latitude, longitude]}
              icon={PIN}
              draggable={!desabilitado}
              eventHandlers={{ dragend: (e) => marcar(e.target.getLatLng().lat, e.target.getLatLng().lng) }}
            />
          )}
        </MapContainer>
      </div>
      <p className="hint" style={{ marginTop: 6 }}>
        {desabilitado
          ? 'Localização verificada na aprovação. Para mudar, fale com o suporte.'
          : temPino
            ? 'Arraste o alfinete até a entrada exata do ponto.'
            : 'Busque o endereço ou toque no mapa para marcar o ponto.'}
      </p>
      <div className="grid grid-2" style={{ gap: 10 }}>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="lat">Latitude</label>
          <input
            id="lat"
            className="input mono"
            type="number"
            step="0.000001"
            value={latitude ?? ''}
            disabled={desabilitado}
            onChange={(e) => aoMudar(e.target.value === '' ? null : Number(e.target.value), longitude)}
          />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="lng">Longitude</label>
          <input
            id="lng"
            className="input mono"
            type="number"
            step="0.000001"
            value={longitude ?? ''}
            disabled={desabilitado}
            onChange={(e) => aoMudar(latitude, e.target.value === '' ? null : Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
