// Link para abrir a localização de um ponto no OpenStreetMap (nova aba).
export function mapaExternoUrl(ponto) {
  return `https://www.openstreetmap.org/?mlat=${ponto.latitude}&mlon=${ponto.longitude}#map=17/${ponto.latitude}/${ponto.longitude}`;
}
