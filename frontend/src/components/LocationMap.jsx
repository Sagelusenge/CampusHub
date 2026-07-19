import { ExternalLink, MapPin } from 'lucide-react';

const cityCoordinates = {
  goma: [-1.6792, 29.2228], bukavu: [-2.5083, 28.8608], kinshasa: [-4.325, 15.3222],
  lubumbashi: [-11.6876, 27.5026], kananga: [-5.8962, 22.4166], 'mbuji-mayi': [-6.136, 23.5898],
  kisangani: [0.5153, 25.191], mbandaka: [0.0487, 18.2603], matadi: [-5.817, 13.4717],
  bunia: [1.5594, 30.2522], kalemie: [-5.9475, 29.1947], kolwezi: [-10.7167, 25.4667],
  uvira: [-3.3953, 29.1378], beni: [0.4911, 29.4731], butembo: [0.1416, 29.2912],
};

export function LocationMap({ latitude, longitude, adresse, ville, province, pays, titre = 'Localisation' }) {
  const hasCoordinates = latitude !== null && latitude !== undefined && latitude !== ''
    && longitude !== null && longitude !== undefined && longitude !== ''
    && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
  const cityKey = String(ville || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
  const fallback = cityCoordinates[cityKey] || [-2.8797, 23.656];
  const lat = hasCoordinates ? Number(latitude) : fallback[0];
  const lon = hasCoordinates ? Number(longitude) : fallback[1];
  const delta = hasCoordinates ? 0.018 : cityCoordinates[cityKey] ? 0.055 : 7;
  const query = [adresse, ville, province, pays].filter(Boolean).join(', ') || `${lat}, ${lon}`;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - delta}%2C${lat - delta}%2C${lon + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lon}`;
  const externalUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${hasCoordinates ? 16 : cityCoordinates[cityKey] ? 13 : 5}/${lat}/${lon}`;
  return <div className="location-map">
    <div className="location-map__heading"><div><MapPin /><span><strong>{titre}</strong><small>{query}{!hasCoordinates && ' • position approximative'}</small></span></div><a href={externalUrl} target="_blank" rel="noreferrer">Ouvrir la carte <ExternalLink /></a></div>
    <iframe title={`Carte — ${titre}`} src={mapUrl} loading="lazy" referrerPolicy="no-referrer" />
  </div>;
}
