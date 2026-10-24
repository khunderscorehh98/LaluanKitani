/**
 * Opens the route preview to any spot: a place, a map label, a saved or pinned
 * place. mode 'leave_by' opens it with the arrival time picker.
 */
export function planRoute(router, { lat, lng, name }, mode) {
  router.push({
    pathname: '/route',
    params: { to_lat: lat, to_lng: lng, to_name: name, ...(mode && { mode }) },
  });
}
