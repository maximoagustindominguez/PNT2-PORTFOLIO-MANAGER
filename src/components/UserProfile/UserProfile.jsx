import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSessionStore } from '../../store/sessionStore';
import { useNotificationsStore } from '../../store/notificationsStore';
import { useModal } from '../../hooks/useModal';
import { supabase } from '../../lib/supabase';
import { createNotificationInSupabase } from '../../lib/alertsService';
import styles from './UserProfile.module.css';

export function UserProfile() {
  const user = useSessionStore((state) => state.user);
  const setUser = useSessionStore((state) => state.setUser);
  const { addNotification, loadNotifications } = useNotificationsStore();
  const { isOpen, openModal, closeModal } = useModal();
  const [customName, setCustomName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (user?.user_metadata?.custom_name) {
      setCustomName(user.user_metadata.custom_name);
    } else {
      setCustomName('');
    }
  }, [user]);

  if (!user) return null;

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'No disponible';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Verificar si han pasado 90 días desde la última modificación
  const canEditName = () => {
    const lastModified = user?.user_metadata?.name_last_modified;
    if (!lastModified) return true; // Primera vez, permitir
    
    try {
      const lastModifiedDate = new Date(lastModified);
      const now = new Date();
      
      // Validar que la fecha sea válida
      if (isNaN(lastModifiedDate.getTime())) {
        console.warn('Fecha de última modificación inválida:', lastModified);
        return true; // Si la fecha es inválida, permitir editar
      }
      
      const daysDiff = (now - lastModifiedDate) / (1000 * 60 * 60 * 24);
      
      // Permitir editar si han pasado exactamente 90 días o más
      return daysDiff >= 90;
    } catch (error) {
      console.error('Error al verificar fecha de modificación:', error);
      return true; // En caso de error, permitir editar
    }
  };

  // Calcular días restantes hasta poder editar nuevamente
  const getDaysUntilCanEdit = () => {
    const lastModified = user?.user_metadata?.name_last_modified;
    if (!lastModified) return null; // Primera vez, no hay restricción
    
    const lastModifiedDate = new Date(lastModified);
    const now = new Date();
    const daysDiff = (now - lastModifiedDate) / (1000 * 60 * 60 * 24);
    const daysRemaining = Math.ceil(90 - daysDiff);
    
    return daysRemaining > 0 ? daysRemaining : 0;
  };

  // Obtener fecha de próxima modificación permitida
  const getNextEditDate = () => {
    const lastModified = user?.user_metadata?.name_last_modified;
    if (!lastModified) return null;
    
    const lastModifiedDate = new Date(lastModified);
    const nextEditDate = new Date(lastModifiedDate);
    nextEditDate.setDate(nextEditDate.getDate() + 90);
    
    return nextEditDate;
  };

  const handleSaveCustomName = async () => {
    if (!canEditName()) {
      setSaveMessage('Debes esperar 90 días desde la última modificación para cambiar el nombre');
      setTimeout(() => setSaveMessage(''), 5000);
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase.auth.updateUser({
        data: {
          custom_name: customName.trim() || null,
          name_last_modified: now,
        },
      });

      if (error) throw error;

      // Actualizar el store con el usuario actualizado
      if (data.user) {
        setUser(data.user);
        setSaveMessage('Nombre guardado exitosamente');
        setIsEditing(false);
        setTimeout(() => setSaveMessage(''), 3000);

        // Crear notificación sobre el cambio de nombre
        const newName = customName.trim() || 'sin nombre personalizado';
        const notificationMessage = `Se ha cambiado el nombre de usuario a ${newName}`;
        
        try {
          const notificationResult = await createNotificationInSupabase({
            assetId: null, // No está relacionado con un asset
            assetName: 'Perfil de Usuario',
            assetSymbol: 'USER',
            alertPrice: 0,
            currentPrice: 0,
            message: notificationMessage,
          }, user.id);

          if (notificationResult.data) {
            // Agregar la notificación al store local
            addNotification(notificationResult.data);
            // Recargar notificaciones para asegurar sincronización
            await loadNotifications(user.id);
          }
        } catch (notificationError) {
          // No bloquear el flujo si falla la notificación
          console.error('Error al crear notificación de cambio de nombre:', notificationError);
        }
      }
    } catch (error) {
      console.error('Error al guardar nombre:', error);
      setSaveMessage('Error al guardar el nombre');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setCustomName(user?.user_metadata?.custom_name || '');
    setIsEditing(false);
    setSaveMessage('');
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openModal();
        }}
        className={styles.profileButton}
      >
        Ver Perfil
      </button>

      {isOpen &&
        createPortal(
          <div className={styles.overlay} onClick={closeModal}>
            <div 
              className={styles.modal} 
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
            <div className={styles.modalHeader}>
              <h2>Perfil de Usuario</h2>
              <button
                type="button"
                onClick={closeModal}
                className={styles.closeButton}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div 
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className={styles.profileSection}>
                <h3>Información Personal</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Nombre de Usuario:</span>
                    {isEditing ? (
                      <div className={styles.editContainer}>
                        <div className={styles.inlineEditContainer}>
                          <input
                            type="text"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            className={styles.nameInputInline}
                            placeholder="Ingresa tu nombre"
                            maxLength={50}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveCustomName();
                            }}
                            disabled={isSaving || !canEditName()}
                            className={styles.confirmButton}
                          >
                            {isSaving ? 'Guardando...' : 'Confirmar'}
                          </button>
                        </div>
                        <p className={styles.warningMessage}>
                          Recuerda que solo podrás modificar el nombre de usuario cada 90 días.
                        </p>
                        {!canEditName() && (
                          <p className={styles.errorMessage}>
                            Debes esperar {getDaysUntilCanEdit()} días más para poder modificar el nombre nuevamente.
                            {getNextEditDate() && (
                              <span> Podrás editarlo nuevamente el {getNextEditDate().toLocaleDateString('es-AR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}.</span>
                            )}
                          </p>
                        )}
                        {saveMessage && (
                          <span className={saveMessage.includes('Error') || saveMessage.includes('esperar') ? styles.errorMessage : styles.successMessage}>
                            {saveMessage}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className={styles.nameDisplay}>
                        <div className={styles.nameValueContainer}>
                          <span className={styles.value}>
                            {user.user_metadata?.custom_name || 'No configurado'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setIsEditing(true);
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                            className={styles.editButton}
                            disabled={!canEditName() && user.user_metadata?.custom_name}
                            title={!canEditName() && user.user_metadata?.custom_name ? `Debes esperar 90 días desde la última modificación. ${getDaysUntilCanEdit() ? `Faltan ${getDaysUntilCanEdit()} días.` : ''}` : ''}
                          >
                            {user.user_metadata?.custom_name ? 'Editar' : 'Configurar'}
                          </button>
                        </div>
                        {/* Mostrar leyenda siempre */}
                        <p className={styles.warningMessage}>
                          Solo podrás modificar el nombre de usuario cada 90 días.
                          {!canEditName() && user.user_metadata?.custom_name && getDaysUntilCanEdit() > 0 && (
                            <span className={styles.daysRemaining}>
                              {' '}Faltan {getDaysUntilCanEdit()} días para poder editarlo nuevamente.
                              {getNextEditDate() && (
                                <span> Podrás editarlo el {getNextEditDate().toLocaleDateString('es-AR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}.</span>
                              )}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.profileSection}>
                <h3>Información de Cuenta</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>ID de Usuario:</span>
                    <span className={styles.value}>{user.id || 'No disponible'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Email:</span>
                    <div className={styles.emailContainer}>
                      <span className={styles.value}>{user.email || 'No disponible'}</span>
                      {user.email_confirmed_at && (
                        <span className={styles.checkmark} title="Email confirmado">✓</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Teléfono:</span>
                    <span className={styles.value}>{user.phone || 'No disponible'}</span>
                  </div>
                </div>
              </div>

              <div className={styles.profileSection}>
                <h3>Fechas Importantes</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Cuenta creada:</span>
                    <span className={styles.value}>{formatDate(user.created_at)}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Último inicio de sesión:</span>
                    <span className={styles.value}>{formatDate(user.last_sign_in_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
        )}
    </>
  );
}

