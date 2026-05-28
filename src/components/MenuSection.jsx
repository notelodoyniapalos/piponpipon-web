import ItemCard from './ItemCard.jsx';
import { categoryHeroUrl } from '../utils/categoryPhotos.js';
import { shareMenuDelDia } from '../utils/share.js';

export default function MenuSection({ category, cart, onAdd, onInc, onDec, onPhotoClick, onRecipeClick }) {
  const heroUrl = categoryHeroUrl(category.id);
  const isMenuDelDia = category.id === 'menu-del-dia';

  const handleShare = async () => {
    const res = await shareMenuDelDia(category.items);
    if (res.via === 'clipboard') alert('✓ Link copiado al portapapeles');
  };

  return (
    <section className="section" id={`cat-${category.id}`}>
      <div className="section__header">
        <span className="icon">{category.icon}</span>
        <h2>{category.name}</h2>
        {isMenuDelDia && (
          <button
            type="button"
            className="section__share"
            onClick={handleShare}
            aria-label="Compartir Menú del Día"
            title="Compartir Menú del Día"
          >
            📤 Compartir
          </button>
        )}
      </div>
      {heroUrl && (
        <div className="category-hero-wrap">
          <img className="category-hero" src={heroUrl} alt="" loading="lazy" />
        </div>
      )}
      <div className="grid">
        {category.items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            categoryId={category.id}
            cart={cart}
            onAdd={onAdd}
            onInc={onInc}
            onDec={onDec}
            onPhotoClick={onPhotoClick}
            onRecipeClick={onRecipeClick}
          />
        ))}
      </div>
    </section>
  );
}
