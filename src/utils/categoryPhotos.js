export const categoryPhotos = {
  cocina: '1546833999-b9f581a1996d',
  ensaladas: '1512621776951-a57141f2eefd',
  pastas: '1621996346565-e3dbc646d9a9',
  tartas: '1565299543923-37dd37887442',
  promos: '1504674900247-0877df9cc836',
  postres: '1551024601-bec78aea704b',
  bebidas: '1544145945-f90425340c7e'
};

export function categoryHeroUrl(categoryId) {
  const id = categoryPhotos[categoryId];
  if (!id) return null;
  return `https://images.unsplash.com/photo-${id}?w=800&h=360&fit=crop&q=80`;
}

export function categoryThumbUrl(categoryId) {
  const id = categoryPhotos[categoryId];
  if (!id) return null;
  return `https://images.unsplash.com/photo-${id}?w=120&h=120&fit=crop&q=80`;
}
