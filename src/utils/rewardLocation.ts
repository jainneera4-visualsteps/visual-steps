export const rewardLocationLabel = (location?: string | null) => {
  const value = location?.trim();
  return value && !['general', 'anywhere', 'any place'].includes(value.toLowerCase()) ? value : 'No location';
};

export const rewardMatchesLocation = (rewardLocation?: string | null, currentLocation?: string | null) => {
  const place = rewardLocationLabel(rewardLocation);
  return place === 'No location' || Boolean(currentLocation?.trim() && place.toLowerCase() === currentLocation.trim().toLowerCase());
};
