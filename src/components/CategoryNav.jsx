import { useEffect, useRef } from 'react';

export default function CategoryNav({ categories, active, onSelect }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const activeEl = container.querySelector('.catnav__tab.active');
    if (activeEl) {
      const cRect = container.getBoundingClientRect();
      const aRect = activeEl.getBoundingClientRect();
      const offset = aRect.left - cRect.left - cRect.width / 2 + aRect.width / 2;
      container.scrollBy({ left: offset, behavior: 'smooth' });
    }
  }, [active]);

  return (
    <nav className="catnav" aria-label="Categorías">
      <div className="catnav__scroll" ref={scrollRef}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`catnav__tab ${active === cat.id ? 'active' : ''}`}
            onClick={() => onSelect(cat.id)}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
