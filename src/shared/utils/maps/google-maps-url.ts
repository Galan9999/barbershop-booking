/**
 * Link that opens an address in Google Maps (the app on a phone, the site on a
 * desktop). Uses the documented Maps URLs scheme: no API key, no cost.
 * https://developers.google.com/maps/documentation/urls/get-started
 */
export function buildGoogleMapsUrl(address: string): string {
  const params = new URLSearchParams({ api: '1', query: address });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}
