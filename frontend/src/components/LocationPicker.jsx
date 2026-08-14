import { Crosshair, MapPin, Navigation } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const CENTRE_RDC = [-2.8797, 23.656];

function coordonnee(value) {
  const nombre = Number(value);
  return Number.isFinite(nombre) ? nombre : null;
}

function MapInteraction({ position, onSelect }) {
  const map = useMap();
  useMapEvents({
    click(event) {
      const latitude = Number(event.latlng.lat.toFixed(6));
      const longitude = Number(event.latlng.lng.toFixed(6));
      onSelect({ latitude, longitude });
      map.flyTo([latitude, longitude], Math.max(map.getZoom(), 17), { duration: 0.7 });
    },
  });
  return position ? <CircleMarker center={position} radius={9} pathOptions={{ color: '#ffffff', weight: 4, fillColor: '#078d82', fillOpacity: 1 }}><Popup>Emplacement exact sélectionné</Popup></CircleMarker> : null;
}

function RecentreMap({ position }) {
  const map = useMap();
  function recentrer() {
    map.flyTo(position || CENTRE_RDC, position ? 17 : 5, { duration: 0.7 });
  }
  return <button className="location-picker__recenter" type="button" onClick={recentrer} title="Recentrer la carte"><Crosshair /></button>;
}

function MapViewport({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, Math.max(map.getZoom(), 17), { duration: 0.7 });
  }, [map, position]);
  return null;
}

export function LocationPicker({ latitude, longitude, adresse, onChange, compact = false }) {
  const [geolocationError, setGeolocationError] = useState('');
  const lat = coordonnee(latitude);
  const lon = coordonnee(longitude);
  const position = lat !== null && lon !== null ? [lat, lon] : null;

  function utiliserPosition() {
    setGeolocationError('');
    if (!navigator.geolocation) {
      setGeolocationError('La géolocalisation n’est pas disponible sur cet appareil.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => onChange({
        latitude: Number(coords.latitude.toFixed(6)),
        longitude: Number(coords.longitude.toFixed(6)),
      }),
      () => setGeolocationError('Position indisponible. Vous pouvez sélectionner le lieu directement sur la carte.'),
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }

  return <section className={`location-picker ${compact ? 'location-picker--compact' : ''}`}>
    <header>
      <span><MapPin /></span>
      <div><strong>Emplacement physique exact</strong><small>Zoomez, puis cliquez précisément sur le bâtiment ou l’entrée principale.</small></div>
      <button type="button" onClick={utiliserPosition}><Navigation />Ma position</button>
    </header>
    <div className="location-picker__map">
      <MapContainer center={position || CENTRE_RDC} zoom={position ? 17 : 5} scrollWheelZoom>
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapInteraction position={position} onSelect={onChange} />
        <MapViewport position={position} />
        <RecentreMap position={position} />
      </MapContainer>
    </div>
    <div className="location-picker__result">
      <div><small>Latitude</small><strong>{lat === null ? 'À sélectionner' : lat.toFixed(6)}</strong></div>
      <div><small>Longitude</small><strong>{lon === null ? 'À sélectionner' : lon.toFixed(6)}</strong></div>
      <div><small>Adresse déclarée</small><strong>{adresse || 'Ajoutez aussi l’adresse écrite ci-dessus.'}</strong></div>
    </div>
    {geolocationError && <p className="location-picker__error">{geolocationError}</p>}
  </section>;
}
