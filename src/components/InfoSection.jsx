export default function InfoSection({ business }) {
  return (
    <>
      <section className="info" id="info">
        <div className="info__inner">
          <div>
            <h2>¿Cómo pedimos?</h2>
            <div className="steps">
              <div className="step">
                <div className="step__num">1</div>
                <div>📋</div>
                <h3 className="step__title">Elegí tus platos del menú</h3>
              </div>
              <div className="step">
                <div className="step__num">2</div>
                <div>🛒</div>
                <h3 className="step__title">Agregá al carrito y completá tus datos</h3>
              </div>
              <div className="step">
                <div className="step__num">3</div>
                <div>💬</div>
                <h3 className="step__title">Confirmá tu pedido por WhatsApp</h3>
              </div>
            </div>
          </div>

          <div>
            <h2>Dónde y cuándo</h2>
            <div className="info-card">
              <div className="info-row">📍 {business.address}</div>
              <div className="info-row">🕐 Delivery: {business.hours.delivery}</div>
              <div className="info-row">🏪 Mostrador: {business.hours.mostrador}</div>
              <div className="info-row">
                📱 WhatsApp:&nbsp;
                <a href={`https://wa.me/${business.whatsapp}`} target="_blank" rel="noopener noreferrer">
                  {business.phone}
                </a>
              </div>
              <div className="info-row">
                📷 Instagram:&nbsp;
                <a
                  href={`https://www.instagram.com/${business.instagram}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @{business.instagram}
                </a>
              </div>
            </div>
          </div>

          <a
            className="viandas-cta"
            href={`https://wa.me/${business.whatsapp}?text=${encodeURIComponent('Hola Pipón Pipón, quería consultar por viandas para empresas.')}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
          >
            Servicio de viandas para empresas — Consultanos 📩
          </a>
        </div>
      </section>

      <footer className="footer-bottom">
        <div>© {new Date().getFullYear()} {business.name} — Hecho con cariño en Vega Maipú</div>
        <div className="credit">
          Diseñado por{' '}
          <a
            href="https://wa.me/5492257652436"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.patagoniacreativa.net
          </a>
        </div>
      </footer>
    </>
  );
}
