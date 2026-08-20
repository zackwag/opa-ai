import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const subjectIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const compIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function formatCurrency(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return 'N/A';
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function FitBounds({ subject, comps }) {
  const map = useMap();
  const points = [[subject.lat, subject.lng]];
  comps.forEach(c => {
    if (c.lat && c.lng) points.push([c.lat, c.lng]);
  });
  if (points.length > 1) {
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40] });
  }
  return null;
}

export default function PropertyMap({ subject, comps, radius }) {
  if (!subject.lat || !subject.lng) return null;

  return (
    <div className="map-container">
      <MapContainer
        center={[subject.lat, subject.lng]}
        zoom={16}
        style={{ height: '400px', width: '100%', borderRadius: '12px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds subject={subject} comps={comps} />
        <Circle
          center={[subject.lat, subject.lng]}
          radius={radius}
          pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.05, weight: 1 }}
        />
        <Marker position={[subject.lat, subject.lng]} icon={subjectIcon}>
          <Popup>
            <strong>{subject.location}</strong><br />
            Assessment: {formatCurrency(subject.market_value)}
          </Popup>
        </Marker>
        {comps.map(comp => (
          comp.lat && comp.lng ? (
            <Marker key={comp.parcel_number} position={[comp.lat, comp.lng]} icon={compIcon}>
              <Popup>
                <strong>{comp.location}</strong><br />
                Assessment: {formatCurrency(comp.market_value)}<br />
                {Math.round(comp.distance_m)}m away | {comp.similarity}% similar
              </Popup>
            </Marker>
          ) : null
        ))}
      </MapContainer>
    </div>
  );
}
