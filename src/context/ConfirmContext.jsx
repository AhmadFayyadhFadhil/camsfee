import React, { createContext, useContext, useState, useRef } from 'react';
import { ShieldAlert, AlertTriangle, Info } from 'lucide-react';

const ConfirmContext = createContext(null);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
};

export const ConfirmProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState({
    title: 'Konfirmasi',
    message: 'Apakah Anda yakin?',
    confirmText: 'Ya',
    cancelText: 'Batal',
    type: 'danger' // danger | warning | info
  });

  const resolveRef = useRef(null);

  const confirm = (opts) => {
    // If it's a string, treat it as the message
    const parsedOpts = typeof opts === 'string' ? { message: opts } : opts;

    setOptions({
      title: parsedOpts.title || 'Konfirmasi Tindakan',
      message: parsedOpts.message || 'Apakah Anda yakin ingin melanjutkan?',
      confirmText: parsedOpts.confirmText || 'Ya, Lanjutkan',
      cancelText: parsedOpts.cancelText || 'Batal',
      type: parsedOpts.type || 'danger'
    });
    setIsOpen(true);

    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(false);
    }
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(true);
    }
  };

  // Select icon based on type
  const renderIcon = () => {
    switch (options.type) {
      case 'warning':
        return <AlertTriangle size={32} />;
      case 'info':
        return <Info size={32} />;
      case 'danger':
      default:
        return <ShieldAlert size={32} />;
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      
      {isOpen && (
        <div className="confirm-backdrop" onClick={handleCancel}>
          <div 
            className={`confirm-modal glass-panel confirm-${options.type}`} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-icon-wrapper">
              {renderIcon()}
            </div>
            <h3 className="confirm-title">{options.title}</h3>
            <p className="confirm-message">{options.message}</p>
            <div className="confirm-actions">
              <button 
                className="confirm-btn confirm-btn-cancel" 
                onClick={handleCancel}
              >
                {options.cancelText}
              </button>
              <button 
                className="confirm-btn confirm-btn-confirm" 
                onClick={handleConfirm}
              >
                {options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
