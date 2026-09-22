/**
 * Lightweight built-in destination coordinates so search can use MongoDB
 * geospatial queries without a paid geocoding API. Coordinates are
 * [longitude, latitude]. Add more destinations as needed.
 */
export const CITIES = {
  goa: { city: 'Goa', state: 'Goa', coordinates: [73.9522, 15.2993] },
  'north goa': { city: 'North Goa', state: 'Goa', coordinates: [73.7503, 15.6027] },
  'south goa': { city: 'South Goa', state: 'Goa', coordinates: [74.0083, 15.0956] },
  manali: { city: 'Manali', state: 'Himachal Pradesh', coordinates: [77.1734, 32.2432] },
  jaipur: { city: 'Jaipur', state: 'Rajasthan', coordinates: [75.7873, 26.9124] },
  udaipur: { city: 'Udaipur', state: 'Rajasthan', coordinates: [73.6935, 24.5854] },
  'jaisalmer': { city: 'Jaisalmer', state: 'Rajasthan', coordinates: [70.9036, 26.9157] },
  ooty: { city: 'Ooty', state: 'Tamil Nadu', coordinates: [76.6938, 11.4102] },
  coorg: { city: 'Coorg', state: 'Karnataka', coordinates: [75.7904, 12.3375] },
  'wayanad': { city: 'Wayanad', state: 'Kerala', coordinates: [76.0006, 11.6854] },
  rishikesh: { city: 'Rishikesh', state: 'Uttarakhand', coordinates: [78.2834, 30.0869] },
  darjeeling: { city: 'Darjeeling', state: 'West Bengal', coordinates: [88.2627, 27.0410] },
  alleppey: { city: 'Alleppey', state: 'Kerala', coordinates: [76.3380, 9.4981] },
  munnar: { city: 'Munnar', state: 'Kerala', coordinates: [77.0653, 10.0889] },
  pondicherry: { city: 'Pondicherry', state: 'Puducherry', coordinates: [79.8105, 11.9416] },
  hampi: { city: 'Hampi', state: 'Karnataka', coordinates: [76.4749, 15.3350] },
  shimla: { city: 'Shimla', state: 'Himachal Pradesh', coordinates: [77.1734, 31.1048] },
  'new delhi': { city: 'New Delhi', state: 'Delhi', coordinates: [77.2090, 28.6139] },
  delhi: { city: 'Delhi', state: 'Delhi', coordinates: [77.2090, 28.6139] },
  mumbai: { city: 'Mumbai', state: 'Maharashtra', coordinates: [72.8777, 19.0760] },
  bangalore: { city: 'Bengaluru', state: 'Karnataka', coordinates: [77.5946, 12.9716] },
  bengaluru: { city: 'Bengaluru', state: 'Karnataka', coordinates: [77.5946, 12.9716] },
  chennai: { city: 'Chennai', state: 'Tamil Nadu', coordinates: [80.2707, 13.0827] },
  kolkata: { city: 'Kolkata', state: 'West Bengal', coordinates: [88.3639, 22.5726] },
  hyderabad: { city: 'Hyderabad', state: 'Telangana', coordinates: [78.4867, 17.3850] },
  'kochi': { city: 'Kochi', state: 'Kerala', coordinates: [76.2673, 9.9312] },
  'kashmir': { city: 'Srinagar', state: 'Jammu & Kashmir', coordinates: [74.7973, 34.0837] },
  srinagar: { city: 'Srinagar', state: 'Jammu & Kashmir', coordinates: [74.7973, 34.0837] },
  leh: { city: 'Leh', state: 'Ladakh', coordinates: [77.5777, 34.1526] },
  'andaman': { city: 'Port Blair', state: 'Andaman & Nicobar', coordinates: [92.7466, 11.6195] },
  mahabalipuram: { city: 'Mahabalipuram', state: 'Tamil Nadu', coordinates: [80.1914, 12.6269] },
  'varkala': { city: 'Varkala', state: 'Kerala', coordinates: [76.7168, 8.7377] },
};

export function findCityCoords(destination) {
  if (!destination) return null;
  const key = String(destination).trim().toLowerCase();
  return CITIES[key] || null;
}