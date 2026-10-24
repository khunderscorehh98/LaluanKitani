/**
 * Opens a saved place's page: our places open their details; pinned spots
 * (houses, places from the map) open the same page for a spot.
 */
export function openSaved(router, saved) {
  if (saved.placeId) {
    router.push(`/place/${saved.placeId}`);
  } else {
    router.push({
      pathname: '/spot',
      params: { lat: saved.location.lat, lng: saved.location.lng, name: saved.name, category: saved.category ?? '' },
    });
  }
}
