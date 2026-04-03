export const rewardImages: Record<string, string> = {
  'Penny': 'https://cdn-icons-png.flaticon.com/512/2489/2489756.png',
  'Cent': 'https://cdn-icons-png.flaticon.com/512/550/550638.png',
  'Token': 'https://cdn-icons-png.flaticon.com/512/2169/2169862.png',
  'Bead': 'https://cdn-icons-png.flaticon.com/512/2953/2953423.png',
  'Star': 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png',
  'Point': 'https://cdn-icons-png.flaticon.com/512/1170/1170611.png',
  'Sticker': 'https://cdn-icons-png.flaticon.com/512/4359/4359922.png',
  'Dollar': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80"%3E%F0%9F%92%B5%3C/text%3E%3C/svg%3E',
  'Coffee': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80"%3E%E2%98%95%3C/text%3E%3C/svg%3E',
  'Drink': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80"%3E%F0%9F%8D%B9%3C/text%3E%3C/svg%3E',
  'Ticket': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80"%3E%F0%9F%8E%9F%EF%B8%8F%3C/text%3E%3C/svg%3E',
  'Hour': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80"%3E%E2%8C%9B%3C/text%3E%3C/svg%3E',
  'Credit': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80"%3E%F0%9F%92%B3%3C/text%3E%3C/svg%3E'
};

export const formatReward = (type: string | undefined, count: number): string => {
  if (!type) return '';
  if (count === 1) return type;
  
  const plurals: Record<string, string> = {
    'Penny': 'Pennies',
    'Cent': 'Cents',
    'Token': 'Tokens',
    'Bead': 'Beads',
    'Star': 'Stars',
    'Point': 'Points',
    'Sticker': 'Stickers',
    'Dollar': 'Dollars',
    'Coffee': 'Coffees',
    'Drink': 'Drinks',
    'Ticket': 'Tickets',
    'Hour': 'Hours',
    'Credit': 'Credits'
  };
  
  return plurals[type] || `${type}s`;
};
