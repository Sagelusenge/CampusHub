import { ExternalLink, MapPin } from 'lucide-react';

export function LocationMap({ latitude, longitude, adresse, ville, province, pays, titre = 'Localisation' }) {
  const hasCoordinates = latitude !== null && latitude !== undefined && latitude !== ''
    && longitude !== null && longitude !== undefined && longitude !== ''
    && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
  const query = hasCoordinates
    ? `${Number(latitude)},${Number(longitude)}`
    : [adresse, ville, province, pays].filter(Boolean).join(', ');
  const encoded = encodeURIComponent(query || 'République démocratique du Congo');
  return <div className="location-map">
    <div className="location-map__heading"><div><MapPin /><span><strong>{titre}</strong><small>{query}</small></span></div><a href={`https://www.google.com/maps/search/?api=1&query=${encoded}`} target="_blank" rel="noreferrer">Ouvrir dans Maps <ExternalLink /></a></div>
    <iframe title={`Carte — ${titre}`} src={`https://www.google.com/maps?q=${encoded}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
  </div>;
}
