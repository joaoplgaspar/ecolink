// Mapa real e interativo com react-leaflet + tiles do OpenStreetMap.
// Mostra os pontos de coleta, a sua localização e popups com ação de agendar.
// (Os tiles do mapa precisam de internet.)

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

function makePin(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 24 24" fill="${color}" stroke="#fff" stroke-width="1.6"><path d="M12 21.5s7-6.7 7-12.2A7 7 0 1 0 5 9.3C5 14.8 12 21.5 12 21.5z"/><circle cx="12" cy="9" r="2.6" fill="#fff" stroke="none"/></svg>`;
  return L.divIcon({
    className: 'pin-marker',
    html: svg,
    iconSize: [30, 38],
    iconAnchor: [15, 38],
    popupAnchor: [0, -34],
  });
}

const POINT_PIN = makePin('#1d9e75');
const SELECTED_PIN = makePin('#ef9f27');
const USER_PIN = makePin('#2563eb');

function FlyTo({ target, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, zoom ?? map.getZoom(), { duration: 0.7 });
  }, [target?.[0], target?.[1], zoom]); // eslint-disable-line
  return null;
}

export default function MapView({
  pontos = [],
  userLocation = null,
  selectedId,
  onSelect,
  onAgendar,
  height = 360,
  focus = null,
  zoom = 12,
}) {
  const pts = pontos.filter((p) => p.latitude != null && p.longitude != null);

  const avg = pts.length
    ? [
        pts.reduce((s, p) => s + p.latitude, 0) / pts.length,
        pts.reduce((s, p) => s + p.longitude, 0) / pts.length,
      ]
    : [-23.55, -46.63];
  const initialCenter = userLocation ? [userLocation.lat, userLocation.lon] : avg;
  const flyTarget = focus || (userLocation ? [userLocation.lat, userLocation.lon] : null);

  return (
    <div className="map-box" style={{ height }}>
      <MapContainer center={initialCenter} zoom={zoom} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyTo target={flyTarget} zoom={focus ? 15 : zoom} />

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lon]} icon={USER_PIN}>
            <Popup>Você está aqui</Popup>
          </Marker>
        )}

        {pts.map((p) => (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={selectedId === p.id ? SELECTED_PIN : POINT_PIN}
            eventHandlers={{ click: () => onSelect?.(p) }}
          >
            <Popup>
              <div className="map-popup">
                <h4>{p.nome}</h4>
                <div className="pop-city">{p.endereco}</div>
                {onAgendar && (
                  <button className="btn btn-sm btn-primary" onClick={() => onAgendar(p)}>
                    Agendar aqui
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
