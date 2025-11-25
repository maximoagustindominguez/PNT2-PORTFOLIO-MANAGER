/**
 * HOOK PERSONALIZADO: useModal
 * 
 * Este hook proporciona funcionalidad para manejar el estado de apertura/cierre de modales.
 * Además, previene el scroll del body cuando un modal está abierto, mejorando la UX.
 * 
 * ¿Qué hace?
 * - Gestiona el estado de apertura/cierre del modal
 * - Bloquea el scroll del body cuando el modal está abierto
 * - Agrega/quita clases CSS para estilizar cuando hay un modal abierto
 * - Limpia los estilos al desmontar el componente
 * 
 * ¿Cómo se usa?
 * const { isOpen, openModal, closeModal, toggleModal } = useModal(false);
 */

import { useState, useEffect } from 'react';

/**
 * Hook para manejar el estado de un modal
 * @param {boolean} initialState - Estado inicial del modal (abierto/cerrado). Por defecto: false (cerrado)
 * @returns {Object} Objeto con:
 *   - isOpen: boolean - Estado actual del modal
 *   - openModal: function - Función para abrir el modal
 *   - closeModal: function - Función para cerrar el modal
 *   - toggleModal: function - Función para alternar el estado del modal
 */
export const useModal = (initialState = false) => {
  // Estado que controla si el modal está abierto o cerrado
  const [isOpen, setIsOpen] = useState(initialState);

  // Función para abrir el modal (establece isOpen a true)
  const openModal = () => setIsOpen(true);
  
  // Función para cerrar el modal (establece isOpen a false)
  const closeModal = () => setIsOpen(false);
  
  // Función para alternar el estado del modal (si está abierto lo cierra, si está cerrado lo abre)
  const toggleModal = () => setIsOpen((prev) => !prev);

  /**
   * EFECTO: GESTIÓN DEL SCROLL Y CLASES CSS
   * 
   * Este efecto se ejecuta cada vez que cambia el estado isOpen.
   * Cuando el modal está abierto:
   * - Bloquea el scroll del body (overflow: hidden) para evitar que el usuario
   *   pueda hacer scroll en la página de fondo mientras el modal está visible
   * - Agrega la clase 'modal-open' al body para permitir estilos personalizados
   * 
   * Cuando el modal está cerrado:
   * - Restaura el scroll normal del body
   * - Remueve la clase 'modal-open'
   * 
   * El return es una función de limpieza que se ejecuta cuando:
   * - El componente se desmonta
   * - El efecto se vuelve a ejecutar (antes de aplicar los nuevos cambios)
   * Esto asegura que siempre se restauren los estilos, incluso si el componente
   * se desmonta mientras el modal está abierto.
   */
  useEffect(() => {
    if (isOpen) {
      // Modal abierto: bloquear scroll y agregar clase
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    } else {
      // Modal cerrado: restaurar scroll y remover clase
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    }

    // Función de limpieza: se ejecuta al desmontar o antes de re-ejecutar el efecto
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]); // Se ejecuta cuando isOpen cambia

  // Retornar todas las funciones y el estado para que los componentes puedan usarlas
  return {
    isOpen,        // Estado actual del modal
    openModal,     // Función para abrir
    closeModal,    // Función para cerrar
    toggleModal,   // Función para alternar
  };
};



