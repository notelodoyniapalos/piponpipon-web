export default function Hero({ query, onQueryChange }) {
  return (
    <section className="hero">
      <div className="hero__inner">
        <div className="search-bar">
          <span className="search-bar__icon" aria-hidden="true">🔍</span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="¿Qué tenés ganas de comer?"
            aria-label="Buscar plato"
          />
          {query && (
            <button
              type="button"
              className="search-bar__clear"
              onClick={() => onQueryChange('')}
              aria-label="Limpiar búsqueda"
            >✕</button>
          )}
        </div>
      </div>
    </section>
  );
}
