import React from 'react';

export function CustomDialog({ state }) {
  if (!state || !state.isOpen) return null;

  return (
    <div className="dialog-overlay">
      <div className="dialog-content">
        <h3 className="dialog-title">{state.title || (state.type === 'confirm' ? 'Conferma' : 'Avviso')}</h3>
        <p className="dialog-message">{state.message}</p>
        <div className="dialog-actions">
          {state.type === 'confirm' && (
            <button className="btn-secondary" onClick={state.onCancel}>Annulla</button>
          )}
          <button className="btn-primary" onClick={state.onConfirm}>OK</button>
        </div>
      </div>
    </div>
  );
}
