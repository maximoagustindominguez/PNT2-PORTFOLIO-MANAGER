import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AssetCard } from '../AssetCard/AssetCard';
import { AssetTable } from '../AssetTable/AssetTable';
import { useModal } from '../../hooks/useModal';
import { searchSymbols, detectAssetType, getAssetPrice } from '../../lib/finnhub';
import { CURRENCY_SYMBOL } from '../../constants';
import styles from './Dashboard.module.css';

export const Dashboard = ({ assets, onAddQuantity, onReduceQuantity, onResetAsset, onDeleteAsset, onAddNewAsset }) => {
  const [viewMode, setViewMode] = useState('cards');
  const { isOpen: showAddModal, openModal: openAddModal, closeModal: closeAddModal } = useModal(false);
  
  // Estados para el modal de agregar activo
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState('');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [assetName, setAssetName] = useState('');
  const [brokers, setBrokers] = useState([{ broker: '', quantity: '', purchasePrice: '' }]); // Array de {broker, quantity, purchasePrice}
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const apiKey = import.meta.env.VITE_FINNHUB_API_KEY;
  
  // Debounce para la búsqueda (esperar 300ms después de que el usuario deje de escribir)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      if (!apiKey) return;
      
      setIsSearching(true);
      try {
        const results = await searchSymbols(searchQuery, apiKey);
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } catch (error) {
        console.error('Error al buscar símbolos:', error);
        setSearchResults([]);
        setShowDropdown(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, apiKey]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Obtener precio cuando se selecciona un símbolo
  useEffect(() => {
    if (!selectedSymbol || !selectedAssetType || !apiKey) return;

    const fetchPrice = async () => {
      setIsLoadingPrice(true);
      try {
        const result = await getAssetPrice(selectedSymbol, selectedAssetType, apiKey);
        if (result.price && result.price > 0) {
          setCurrentPrice(result.price);
          // Si no hay PPC ingresado, usar el precio actual como default
          setPurchasePrice((prev) => prev || result.price.toString());
        } else {
          setCurrentPrice(0);
        }
      } catch (error) {
        console.error('Error al obtener precio:', error);
        setCurrentPrice(0);
      } finally {
        setIsLoadingPrice(false);
      }
    };

    fetchPrice();
  }, [selectedSymbol, selectedAssetType, apiKey]);

  // Calcular cantidad total de todos los brokers
  const totalQuantity = brokers.reduce((sum, b) => {
    return sum + (parseFloat(b.quantity) || 0);
  }, 0);

  // Calcular valor total
  const totalValue = totalQuantity * (currentPrice || 0);

  // Agregar nueva línea de broker
  const handleAddBroker = () => {
    setBrokers([...brokers, { broker: '', quantity: '', purchasePrice: '' }]);
  };

  // Actualizar broker o cantidad en una línea específica
  const handleBrokerChange = (index, field, value) => {
    const updated = [...brokers];
    updated[index] = { ...updated[index], [field]: value };
    setBrokers(updated);
  };

  // Eliminar línea de broker
  const handleRemoveBroker = (index) => {
    if (brokers.length > 1) {
      setBrokers(brokers.filter((_, i) => i !== index));
    }
  };

  // Obtener step según el tipo de asset (enteros para stocks/bonds/etf, decimales para crypto)
  const getQuantityStep = () => {
    return selectedAssetType === 'crypto' ? '0.00000001' : '1';
  };

  // Manejar selección de símbolo desde el dropdown
  const handleSelectSymbol = (result) => {
    const symbol = result.symbol || result.displaySymbol || '';
    const type = detectAssetType(symbol, result);
    const name = result.description || symbol;
    
    setSelectedSymbol(symbol);
    setSelectedAssetType(type);
    setAssetName(name);
    setSearchQuery(symbol);
    setShowDropdown(false);
    setSearchResults([]);
  };

  // Resetear el modal
  const resetModal = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    setSelectedSymbol('');
    setSelectedAssetType('');
    setCurrentPrice(0);
    setAssetName('');
    setBrokers([{ broker: '', quantity: '', purchasePrice: '' }]);
    setIsLoadingPrice(false);
    setIsSearching(false);
  };

  // Manejar cierre del modal
  const handleCloseModal = () => {
    resetModal();
    closeAddModal();
  };

  // Calcular PPC promedio ponderado
  const calculateAveragePPC = () => {
    let totalValue = 0;
    let totalQuantity = 0;
    
    brokers.forEach(brokerData => {
      const qty = parseFloat(brokerData.quantity) || 0;
      if (qty > 0) {
        // Si no hay PPC ingresado, usar el precio actual como default
        const ppc = brokerData.purchasePrice 
          ? parseFloat(brokerData.purchasePrice) 
          : currentPrice;
        
        totalValue += qty * ppc;
        totalQuantity += qty;
      }
    });
    
    // Retornar el promedio ponderado, o el precio actual si no hay cantidad
    return totalQuantity > 0 ? totalValue / totalQuantity : currentPrice;
  };

  // Manejar envío del formulario
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedSymbol || totalQuantity <= 0) return;
    
    // Validar que todos los brokers tengan nombre y cantidad
    const validBrokers = brokers
      .map(b => ({
        broker: b.broker.trim(),
        quantity: parseFloat(b.quantity) || 0,
        purchasePrice: b.purchasePrice ? parseFloat(b.purchasePrice) : currentPrice
      }))
      .filter(b => b.broker && b.quantity > 0);
    
    if (validBrokers.length === 0) return;
    
    // Calcular el PPC promedio ponderado de todos los brokers
    const averagePPC = calculateAveragePPC();
    
    // Guardar el activo con la información de brokers y el PPC promedio
    onAddNewAsset(selectedAssetType, selectedSymbol, totalQuantity, averagePPC, currentPrice, assetName, validBrokers);
    handleCloseModal();
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.controls}>
        <button
          type="button"
          onClick={() => setViewMode('cards')}
          className={viewMode === 'cards' ? styles.active : ''}
        >
          Activos en Cartera
        </button>
        <button
          type="button"
          onClick={() => setViewMode('table')}
          className={viewMode === 'table' ? styles.active : ''}
        >
          Posición Consolidada
        </button>
      </div>

      {viewMode === 'cards' ? (
        <>
          <div className={styles.cardsContainer}>
            {assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onAddQuantity={onAddQuantity}
                onReduceQuantity={onReduceQuantity}
                onResetAsset={onResetAsset}
                onDeleteAsset={onDeleteAsset}
              />
            ))}
            <button
              type="button"
              className={styles.addCardButton}
              onClick={openAddModal}
              aria-label="Agregar nuevo activo"
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 5V19M5 12H19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </>
      ) : (
        <AssetTable assets={assets} />
      )}

      {showAddModal &&
        createPortal(
          <div
            className={styles.modalOverlay}
            onClick={(e) => {
              // Solo cerrar si el click es directamente en el overlay (no en el contenido del modal)
              // Verificar que el target sea exactamente el overlay, no un hijo
              if (e.target === e.currentTarget) {
                handleCloseModal();
              }
            }}
          >
            <div
              className={styles.modalContent}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onFocus={(e) => {
                e.stopPropagation();
              }}
            >
              <h3 className={styles.modalTitle}>Agregar nuevo activo</h3>
              <form 
                onSubmit={handleSubmit} 
                className={styles.modalForm}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Campo de búsqueda de ticker con autocompletado */}
                <div className={styles.modalFormGroup}>
                  <label className={styles.modalLabel}>Ticker</label>
                  <div className={styles.searchContainer}>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        setSearchQuery(value);
                        if (!value) {
                          setSelectedSymbol('');
                          setSelectedAssetType('');
                          setCurrentPrice(0);
                          setAssetName('');
                        }
                      }}
                      className={styles.modalInput}
                      placeholder="Buscar ticker (ej: AAPL, BTC, SPY)"
                      required
                      autoComplete="off"
                    />
                    {isSearching && (
                      <span className={styles.searchingIndicator}>Buscando...</span>
                    )}
                    {showDropdown && searchResults.length > 0 && (
                      <div ref={dropdownRef} className={styles.dropdown}>
                        {searchResults.map((result, index) => {
                          const symbol = result.symbol || result.displaySymbol || '';
                          const description = result.description || symbol;
                          return (
                            <button
                              key={index}
                              type="button"
                              className={styles.dropdownItem}
                              onClick={() => handleSelectSymbol(result)}
                            >
                              <div className={styles.dropdownItemSymbol}>{symbol}</div>
                              <div className={styles.dropdownItemDescription}>{description}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Nombre completo del asset */}
                {assetName && selectedSymbol && (
                  <div className={styles.modalFormGroup}>
                    <label className={styles.modalLabel}>Nombre</label>
                    <input
                      type="text"
                      value={assetName}
                      className={styles.modalInput}
                      readOnly
                      disabled
                    />
                  </div>
                )}

                {/* Tipo de activo (automático, solo lectura) */}
                {selectedAssetType && (
                  <div className={styles.modalFormGroup}>
                    <label className={styles.modalLabel}>Tipo</label>
                    <input
                      type="text"
                      value={
                        selectedAssetType === 'stock' ? 'Acción' :
                        selectedAssetType === 'crypto' ? 'Criptomoneda' :
                        selectedAssetType === 'etf' ? 'ETF' :
                        selectedAssetType === 'bond' ? 'Bono' : selectedAssetType
                      }
                      className={styles.modalInput}
                      readOnly
                      disabled
                    />
                  </div>
                )}

                {/* Precio actual (automático, solo lectura) */}
                {selectedSymbol && (
                  <div className={styles.modalFormGroup}>
                    <label className={styles.modalLabel}>Precio Actual</label>
                    {isLoadingPrice ? (
                      <div className={styles.loadingPrice}>Cargando precio...</div>
                    ) : (
                      <input
                        type="text"
                        value={currentPrice > 0 ? `${CURRENCY_SYMBOL}${currentPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'No disponible'}
                        className={styles.modalInput}
                        readOnly
                        disabled
                      />
                    )}
                  </div>
                )}

                {/* Brokers, Cantidades y PPC */}
                <div className={styles.modalFormGroup}>
                  <label className={styles.modalLabel}>Broker, Cantidad y PPC</label>
                  {brokers.map((brokerData, index) => (
                    <div key={index} className={styles.brokerContainer}>
                      <div className={styles.brokerRow}>
                        <input
                          type="text"
                          value={brokerData.broker}
                          onChange={(e) => handleBrokerChange(index, 'broker', e.target.value)}
                          onBlur={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          className={`${styles.modalInput} ${styles.brokerInput}`}
                          placeholder="Nombre del broker"
                          required={index === 0}
                        />
                        <input
                          type="number"
                          step={getQuantityStep()}
                          min="0"
                          value={brokerData.quantity}
                          onChange={(e) => handleBrokerChange(index, 'quantity', e.target.value)}
                          onBlur={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          className={`${styles.modalInput} ${styles.quantityInput}`}
                          placeholder="0"
                          required={index === 0}
                        />
                        {brokers.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveBroker(index);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className={styles.removeBrokerBtn}
                            aria-label="Eliminar broker"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <div className={styles.ppcRow}>
                        <label className={styles.ppcLabel}>
                          PPC (Precio Promedio de Compra)
                          <span className={styles.optionalLabel}> - Opcional</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={brokerData.purchasePrice}
                          onChange={(e) => handleBrokerChange(index, 'purchasePrice', e.target.value)}
                          onBlur={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          className={styles.modalInput}
                          placeholder={currentPrice > 0 ? `Por defecto: ${CURRENCY_SYMBOL}${currentPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Ingrese el precio de compra'}
                        />
                        {!brokerData.purchasePrice && currentPrice > 0 && (
                          <div className={styles.helperText}>
                            Se usará el precio actual ({CURRENCY_SYMBOL}{currentPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddBroker();
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={styles.addBrokerBtn}
                  >
                    + Agregar otro broker
                  </button>
                  {totalQuantity > 0 && (
                    <div className={styles.totalQuantity}>
                      Cantidad total: {totalQuantity.toLocaleString('es-AR', {
                        minimumFractionDigits: selectedAssetType === 'crypto' ? 8 : 0,
                        maximumFractionDigits: selectedAssetType === 'crypto' ? 8 : 2
                      })}
                    </div>
                  )}
                  {totalQuantity > 0 && (
                    <div className={styles.averagePPC}>
                      PPC Promedio: {CURRENCY_SYMBOL}{calculateAveragePPC().toLocaleString('es-AR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                  )}
                </div>

                {/* Valor total calculado */}
                {selectedSymbol && totalQuantity > 0 && (
                  <div className={styles.modalFormGroup}>
                    <label className={styles.modalLabel}>Valor Total</label>
                    <div className={styles.totalValue}>
                      {CURRENCY_SYMBOL}{totalValue.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                )}

                <div className={styles.modalButtons}>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className={styles.modalCancelBtn}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={styles.modalAcceptBtn}
                    disabled={!selectedSymbol || totalQuantity <= 0 || !brokers.some(b => b.broker.trim() && parseFloat(b.quantity) > 0)}
                  >
                    Agregar
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
