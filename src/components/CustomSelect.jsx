import { useEffect, useRef, useState } from 'react';

// Replaces the native <select> so the options popover renders INSIDE the page
// instead of opening the OS picker (the system roller on iOS, dropdown on Android,
// floating list on desktop). Same dark theme, fully integrated with the card.
export default function CustomSelect({ id, value, options, onChange, label }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener('pointerdown', onDocPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (opt) => {
    onChange(opt);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="custom-select" ref={wrapRef}>
      <button
        type="button"
        ref={triggerRef}
        id={id}
        className={`custom-select__trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
      >
        <span className="custom-select__value">{value}</span>
        <span className="custom-select__caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <ul className="custom-select__menu" role="listbox" aria-label={label}>
          {options.map((opt) => (
            <li
              key={opt}
              role="option"
              aria-selected={opt === value}
              className={`custom-select__option ${opt === value ? 'selected' : ''}`}
              onClick={() => pick(opt)}
            >
              <span>{opt}</span>
              {opt === value && <span className="custom-select__check" aria-hidden="true">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
