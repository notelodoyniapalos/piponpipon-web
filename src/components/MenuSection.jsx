import ItemCard from './ItemCard.jsx';
import { categoryHeroUrl } from '../utils/categoryPhotos.js';

export default function MenuSection({ category, cart, onAdd, onInc, onDec, onPhotoClick, onRecipeClick }) {
  const heroUrl = categoryHeroUrl(category.id);

  return (
    <section className="section" id={`cat-${category.id}`}>
      <div className="section__header">
        <span className="icon">{category.icon}</span>
        <h2>{category.name}</h2>
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
