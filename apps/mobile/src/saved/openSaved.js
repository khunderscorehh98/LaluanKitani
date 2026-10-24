/**
 * Opens a saved place: our places open their details page; pinned points
 * (houses and other spots not in the database) are shown on the Map tab.
 */
export function openSaved(router, saved) {
  if (saved.placeId) {
    router.push(`/place/${saved.placeId}`);
  } else {
    // `at` makes opening the same spot twice still move the map
    router.navigate({
      pathname: '/',
      params: { lng: saved.location.lng, lat: saved.location.lat, at: Date.now() },
    });
  }
}
