// US-08: search still works without a device location — the app may pass a `cityId` and the
// server searches from that city's centroid. A small static table for the launch cities.
export const CITY_COORDINATES: Readonly<Record<string, { lat: number; lng: number }>> = {
  bogota: { lat: 4.711, lng: -74.0721 },
  medellin: { lat: 6.2442, lng: -75.5812 },
  cali: { lat: 3.4516, lng: -76.532 },
  barranquilla: { lat: 10.9685, lng: -74.7813 },
  cartagena: { lat: 10.391, lng: -75.4794 },
  bucaramanga: { lat: 7.1193, lng: -73.1227 },
};

export function resolveCity(cityId: string): { lat: number; lng: number } | null {
  return CITY_COORDINATES[cityId] ?? null;
}
