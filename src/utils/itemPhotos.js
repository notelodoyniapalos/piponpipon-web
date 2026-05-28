const ITEM_KEYWORDS = {
  'bife-chorizo': 'steak,beef,grill',
  'bife-chorizo-pobre': 'steak,fries,egg',
  'pechuga-grillada': 'grilled,chicken,breast',
  'milanesa': 'breaded,cutlet,schnitzel',
  'milanesa-napolitana': 'schnitzel,tomato,cheese',
  'milanesa-suiza': 'cordon,bleu,ham,cheese',
  'suprema': 'chicken,schnitzel',
  'suprema-napolitana': 'chicken,parmesan,tomato',
  'suprema-suiza': 'chicken,cheese,ham',
  'guiso-lentejas': 'lentil,stew,bowl',
  'ensalada-cesar': 'caesar,salad,parmesan',
  'ensalada-atun': 'tuna,salad,olives',
  'ensalada-completa': 'mixed,salad,fresh',
  'ensalada-completa-pollo': 'chicken,salad,bowl',
  'ensalada-lacar': 'grain,bowl,quinoa,rice',
  'tallarines': 'tagliatelle,pasta,noodles',
  'noquis': 'gnocchi,pasta,potato',
  'tarta-pollo-verdeo': 'chicken,quiche,pie',
  'tarta-espinaca': 'spinach,quiche,green',
  'tarta-jamon-queso': 'ham,cheese,quiche',
  'tarta-choclo': 'corn,quiche,sweetcorn',
  'tarta-vegetales': 'vegetable,quiche,roasted',
  'promo-tarta-ensalada': 'quiche,salad,lunch,combo',
  'flan': 'flan,caramel,custard',
  'budin-pan': 'bread,pudding,dessert',
  'ensalada-frutas': 'fruit,salad,berries',
  'agua-500': 'water,bottle,mineral',
  'agua-1500': 'water,bottle,glass',
  'gaseosa-500': 'soda,cola,bottle',
  'gaseosa-1500': 'soda,beverage,bottle'
};

function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function itemPhotoUrl(itemId, w = 120, h = 120) {
  const keywords = ITEM_KEYWORDS[itemId] || 'food,homemade';
  const seed = hash(itemId);
  return `https://loremflickr.com/${w}/${h}/${encodeURIComponent(keywords)}?lock=${seed}`;
}
