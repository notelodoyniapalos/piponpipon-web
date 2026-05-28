import Modal from './Modal.jsx';
import { useInstallPrompt } from '../utils/useInstallPrompt.js';

const CHANNEL_URL = 'https://whatsapp.com/channel/0029Vb8DG4b5PO0xEeGkzI1Q';

export default function JoinChannelModal({ open, onClose, context }) {
  const isRecipe = context === 'recipe';
  const title = isRecipe ? '¡Acceso Cliente ORO!' : '¡Sumate Cliente ORO!';
  const install = useInstallPrompt();

  const handleInstall = async () => {
    const outcome = await install.promptInstall();
    if (outcome === 'accepted') onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={null}
      className="modal--oro modal--heartbeat"
      footer={
        <div className="modal-actions modal-actions--stack">
          <a
            className="oro-cta"
            href={CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
          >
            🏆 ¡Quiero ser Cliente ORO!
          </a>
          {install.canInstall && (
            <button className="install-cta" type="button" onClick={handleInstall}>
              📱 Instalar la App PRO
            </button>
          )}
          {install.isIOS && (
            <p className="install-ios-hint">
              📱 <strong>iPhone</strong>: tocá <strong>Compartir</strong> ↗ y luego
              <strong> Agregar a pantalla de inicio</strong>
            </p>
          )}
          {install.installed && (
            <p className="install-ok">✓ Ya tenés la App instalada</p>
          )}
          <button className="btn-secondary" onClick={onClose}>Ahora no</button>
        </div>
      }
    >
      <div className="oro">
        <div className="oro__bubble">
          <img src="/logo-icon.svg" alt="" className="oro__avatar" />
          <div className="oro__speech">
            <div className="oro__title">{title}</div>
            <p className="oro__lead">
              {isRecipe
                ? <>Para descargar esta receta, <strong>sumate GRATIS</strong> al canal de Pipón.</>
                : <>Sumate <strong>GRATIS</strong> al canal de Pipón y desbloqueá:</>}
            </p>
            <ul className="oro__perks">
              <li>⚡ <strong>Descuentos exclusivos</strong> solo para miembros</li>
              <li>🔥 <strong>Promos limitadas</strong> Cliente ORO</li>
              <li>📅 Acceso anticipado al <strong>Menú del Día</strong></li>
              <li>📖 <strong>Recetas + Video</strong>, novedades y sorpresas</li>
            </ul>

            <div className="oro__pro">
              <div className="oro__pro-badge">📱 PRO</div>
              <div className="oro__pro-text">
                <strong>{install.installed ? '¡Ya sos PRO!' : '¿Querés más?'}</strong>{' '}
                {install.installed
                  ? <>Tenés la App instalada. Próximamente vas a tener funciones premium, descuentos extra y beneficios exclusivos.</>
                  : <>
                      {install.canInstall || install.isIOS
                        ? <>Instalá nuestra App y convertite en <strong>Cliente PRO</strong>: funciones premium, descuentos extra y beneficios exclusivos.</>
                        : <>Próximamente vas a poder <strong>descargar nuestra App</strong> y convertirte en <strong>Cliente PRO</strong>: funciones premium, descuentos extra y beneficios exclusivos.</>}
                      <br />
                      <em>Sumate al canal y te avisamos primero.</em>
                    </>}
              </div>
            </div>

            <p className="oro__free">100% gratis · Te podés ir cuando quieras</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
