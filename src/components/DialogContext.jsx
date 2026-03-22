import React, { createContext, useContext, useState } from 'react';
import { CustomDialog } from './CustomDialog';

const DialogContext = createContext(null);

/**
 * DialogProvider wraps the app and provides showAlert / showConfirm
 * to any descendant without prop drilling.
 */
export function DialogProvider({ children }) {
  const [dialogState, setDialogState] = useState({
    isOpen: false, title: '', message: '', type: 'alert',
    onConfirm: null, onCancel: null
  });

  const showAlert = (title, message) => {
    setDialogState({
      isOpen: true, title, message, type: 'alert',
      onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false })),
      onCancel: null
    });
  };

  const showConfirm = (title, message, onConfirm, onCancel) => {
    setDialogState({
      isOpen: true, title, message, type: 'confirm',
      onConfirm: () => {
        setDialogState(prev => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: () => {
        setDialogState(prev => ({ ...prev, isOpen: false }));
        if (onCancel) onCancel();
      }
    });
  };

  /**
   * showChoice — dialog with N custom buttons.
   * buttons: [{ label: string, onClick: fn, className?: string }]
   */
  const showChoice = (title, message, buttons) => {
    setDialogState({
      isOpen: true, title, message, type: 'choice',
      buttons: buttons.map(btn => ({
        ...btn,
        onClick: () => {
          setDialogState(prev => ({ ...prev, isOpen: false }));
          if (btn.onClick) btn.onClick();
        }
      }))
    });
  };

  const showPrompt = (title, message, initialValue, onConfirm, onCancel) => {
    setDialogState({
      isOpen: true, title, message, type: 'prompt', initialValue,
      onConfirm: (val) => {
        setDialogState(prev => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm(val);
      },
      onCancel: () => {
        setDialogState(prev => ({ ...prev, isOpen: false }));
        if (onCancel) onCancel();
      }
    });
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showChoice, showPrompt }}>
      {children}
      <CustomDialog state={dialogState} />
    </DialogContext.Provider>
  );
}

/** Hook to consume the dialog context */
export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used inside DialogProvider');
  return ctx;
}
