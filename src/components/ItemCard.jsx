import { useMemo, useState } from 'react';
import { formatPrice } from '../utils/formatPrice.js';
import { itemPhotoUrl } from '../utils/itemPhotos.js';
import { categoryThumbUrl } from '../utils/categoryPhotos.js';
import CustomSelect from './CustomSelect.jsx';
import { makeKey } from '../App.jsx';

function initialExtras(item) {
  if (!Array.isArray(item.extras) || item.extras.length === 0) return null;
  const out = {};
  for (const ex of item.extras) {
    out[ex.label] = ex.options[0];
  }
  return out;
}

export default function ItemCard({ item, categoryId, cart, onAdd, onInc, onDec, onPhotoClick, onRecipeClick }) {
  const hasExtras = Array.isArray(item.extras) && item.extras.length > 0;
  const [selected, setSelected] = useState(() => initialExtras(item));
  const [pulse, setPulse] = useState(false);

  const key = makeKey(item.id, selected);
  const inCart = useMemo(() => cart.find((i) => i.key === key), [cart, key]);
  const isPromo = categoryId === 'promos';
  const photoSrc = item.photo || itemPhotoUrl(item.id, 120, 120);

  const handleAdd = () => {
    onAdd({
      id: item.id,
      name: item.name,
      price: item.price,
      extras: selected
    });
    setPulse(true);
    setTimeout(() => setPulse(false), 320);
  };

  const updateExtra = (label, value) => {
    setSelected((prev) => ({ ...(prev || {}), [label]: value }));
  };

  const handlePhotoError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = categoryThumbUrl(categoryId) || '';
  };

  return (
    <article className={`card ${isPromo ? 'promo' : ''}`}>
      <div className="card__top">
        <h3 className="card__name">{item.name}</h3>
        <button
          type="button"
          className="card__photo-btn"
          onClick={() => onPhotoClick && onPhotoClick(photoSrc, item.name)}
          aria-label={`Ampliar foto de ${item.name}`}
        >
          <img
            className="card__photo"
            src={photoSrc}
            alt=""
            loading="lazy"
            onError={handlePhotoError}
          />
          <span className="card__photo-zoom" aria-hidden="true">🔍</span>
        </button>
      </div>

      {item.description && <p className="card__desc">{item.description}</p>}

      {hasExtras && (
        <div className="extras">
          {item.extras.map((ex) => (
            <div className="card__option" key={ex.label}>
              <label htmlFor={`opt-${item.id}-${ex.label}`}>
                {ex.label}:{ex.required ? '' : ' (opcional)'}
              </label>
              <CustomSelect
                id={`opt-${item.id}-${ex.label}`}
                value={(selected && selected[ex.label]) || ex.options[0]}
                options={ex.options}
                onChange={(val) => updateExtra(ex.label, val)}
                label={`${ex.label} para ${item.name}`}
              />
            </div>
          ))}
        </div>
      )}

      <div className="card__bottom">
        <span className="card__price">{formatPrice(item.price)}</span>
        <div className="card__actions">
          <button
            type="button"
            className="recipe-btn"
            onClick={() => onRecipeClick && onRecipeClick(item)}
            aria-label={`Descargar receta y video de ${item.name}`}
            title="Descargar Receta + Video (Cliente ORO)"
          >
            <span className="recipe-btn__icon" aria-hidden="true">📖</span>
            <span className="recipe-btn__text">Receta + Video</span>
          </button>
          {inCart ? (
            <div className="qty" role="group" aria-label={`Cantidad de ${item.name}`}>
              <button onClick={() => onDec(inCart.key)} aria-label="Quitar uno">−</button>
              <span>{inCart.qty}</span>
              <button onClick={() => onInc(inCart.key)} aria-label="Agregar uno">+</button>
            </div>
          ) : (
            <button
              className={`add-btn ${pulse ? 'pulse' : ''}`}
              onClick={handleAdd}
              aria-label={`Agregar ${item.name} al carrito`}
            >
              +
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
