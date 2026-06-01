/**
 * Hand-coded country -> {lat, lon} lookup for the WTY dataset.
 * Air-gapped friendly: no external geocoding service, no runtime fetch.
 * Coordinates are the approximate population-weighted centre of each country.
 * Source: public-domain centroids (e.g. Natural Earth, OurAirports country list).
 *
 * To add a new country: append a row. To rename: keep the source spelling
 * exactly as it appears in the `country` field of the claims collection.
 */
export const COUNTRY_COORDS: Record<string, [number, number]> = {
  // Europe
  'United Kingdom': [54.0, -2.0],
  'France': [46.2, 2.2],
  'Germany': [51.2, 10.5],
  'Belgium': [50.5, 4.5],
  'Netherlands': [52.1, 5.3],
  'Spain': [40.2, -3.7],
  'Italy': [42.8, 12.5],
  'Ireland': [53.4, -8.2],
  'Sweden': [60.1, 18.6],
  'Norway': [60.5, 9.0],
  'Denmark': [56.0, 10.0],
  'Finland': [61.9, 25.7],
  'Poland': [51.9, 19.1],
  'Czech Republic': [49.8, 15.5],
  'Slovakia': [48.7, 19.7],
  'Hungary': [47.2, 19.5],
  'Austria': [47.5, 14.6],
  'Switzerland': [46.8, 8.2],
  'Portugal': [39.4, -8.2],
  'Greece': [39.1, 21.8],
  'Romania': [45.9, 24.9],
  'Bulgaria': [42.7, 25.5],
  'Lithuania': [55.2, 23.9],
  'Latvia': [56.9, 24.6],
  'Estonia': [58.6, 25.0],
  'Ukraine': [48.4, 31.2],
  'Slovenia': [46.2, 14.9],
  'Croatia': [45.1, 15.2],
  'Serbia': [44.0, 21.0],
  'Iceland': [64.9, -19.0],
  'Luxembourg': [49.8, 6.1],
  'Cyprus': [35.1, 33.4],
  'Malta': [35.9, 14.5],

  // North America
  'USA': [37.1, -95.7],
  'United States': [37.1, -95.7],
  'Canada': [56.1, -106.3],
  'Mexico': [23.6, -102.5],

  // South America
  'Brazil': [-14.2, -51.9],
  'Argentina': [-38.4, -63.6],
  'Chile': [-35.7, -71.5],
  'Colombia': [4.6, -74.3],
  'Peru': [-9.2, -75.0],

  // Middle East
  'Turkey': [38.9, 35.2],
  'Saudi Arabia': [23.9, 45.1],
  'United Arab Emirates': [23.4, 53.8],
  'Utd.Arab Emir.': [23.4, 53.8],
  'Israel': [31.0, 34.9],
  'Egypt': [26.8, 30.8],
  'Qatar': [25.4, 51.2],
  'Oman': [21.5, 55.9],
  'Kuwait': [29.3, 47.5],

  // Africa
  'South Africa': [-30.6, 22.9],
  'Morocco': [31.8, -7.1],
  'Kenya': [-0.0, 37.9],
  'Nigeria': [9.1, 8.7],
  'Algeria': [28.0, 1.7],

  // Asia / Oceania
  'India': [20.6, 78.9],
  'China': [35.9, 104.2],
  'Japan': [36.2, 138.3],
  'South Korea': [35.9, 127.8],
  'Singapore': [1.4, 103.8],
  'Malaysia': [4.2, 101.9],
  'Thailand': [15.9, 100.9],
  'Indonesia': [-0.8, 113.9],
  'Philippines': [12.9, 121.8],
  'Vietnam': [14.1, 108.3],
  'Australia': [-25.3, 133.8],
  'New Zealand': [-40.9, 174.9],

  // Misc / stand-ins
  '#': [0, 0]
};

/**
 * Map a dataset country name to the name used in [worldShapes.ts](worldShapes.ts).
 * The atlas (Natural Earth) sometimes uses a different official spelling
 * than the source CSV. Add new entries here as the data evolves.
 */
export const COUNTRY_NAME_TO_ATLAS: Record<string, string> = {
  'USA': 'United States of America',
  'United States': 'United States of America',
  'Czech Republic': 'Czechia',
  'Utd.Arab Emir.': 'United Arab Emirates',
  // 'Singapore' and 'Malta' are absent from the 110m simplification entirely;
  // the bubble is still drawn at its centroid but no underlying landmass.
};

/**
 * Coarse-grained continental regions used by the Supply tab's regional
 * rollup KPI strip. Add new countries here as the dataset grows. Anything
 * not listed falls into 'Other'.
 */
export const COUNTRY_REGION: Record<string, 'Europe' | 'Americas' | 'APAC' | 'MEA' | 'Other'> = {
  // Europe
  'United Kingdom': 'Europe', 'France': 'Europe', 'Germany': 'Europe', 'Belgium': 'Europe',
  'Netherlands': 'Europe', 'Spain': 'Europe', 'Italy': 'Europe', 'Ireland': 'Europe',
  'Sweden': 'Europe', 'Norway': 'Europe', 'Denmark': 'Europe', 'Finland': 'Europe',
  'Poland': 'Europe', 'Czech Republic': 'Europe', 'Slovakia': 'Europe', 'Hungary': 'Europe',
  'Austria': 'Europe', 'Switzerland': 'Europe', 'Portugal': 'Europe', 'Greece': 'Europe',
  'Romania': 'Europe', 'Bulgaria': 'Europe', 'Lithuania': 'Europe', 'Latvia': 'Europe',
  'Estonia': 'Europe', 'Ukraine': 'Europe', 'Slovenia': 'Europe', 'Croatia': 'Europe',
  'Serbia': 'Europe', 'Iceland': 'Europe', 'Luxembourg': 'Europe', 'Cyprus': 'Europe',
  'Malta': 'Europe',

  // Americas
  'USA': 'Americas', 'United States': 'Americas', 'Canada': 'Americas', 'Mexico': 'Americas',
  'Brazil': 'Americas', 'Argentina': 'Americas', 'Chile': 'Americas', 'Colombia': 'Americas',
  'Peru': 'Americas',

  // Middle East + Africa
  'Turkey': 'MEA', 'Saudi Arabia': 'MEA', 'United Arab Emirates': 'MEA', 'Utd.Arab Emir.': 'MEA',
  'Israel': 'MEA', 'Egypt': 'MEA', 'Qatar': 'MEA', 'Oman': 'MEA', 'Kuwait': 'MEA',
  'South Africa': 'MEA', 'Morocco': 'MEA', 'Kenya': 'MEA', 'Nigeria': 'MEA', 'Algeria': 'MEA',

  // APAC
  'India': 'APAC', 'China': 'APAC', 'Japan': 'APAC', 'South Korea': 'APAC',
  'Singapore': 'APAC', 'Malaysia': 'APAC', 'Thailand': 'APAC', 'Indonesia': 'APAC',
  'Philippines': 'APAC', 'Vietnam': 'APAC', 'Australia': 'APAC', 'New Zealand': 'APAC'
};

/**
 * Project a (lat, lon) pair onto a 1000x500 SVG canvas using equirectangular
 * (a.k.a. plate carree) projection. Same canvas + projection as
 * [worldShapes.ts](worldShapes.ts) so bubbles align with the underlying
 * landmass.
 */
export function project(lat: number, lon: number, width = 1000, height = 500): [number, number] {
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return [x, y];
}
