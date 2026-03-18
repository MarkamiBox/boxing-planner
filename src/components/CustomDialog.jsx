import React from 'react';

export function CustomDialog({ state }) {
  if (!state || !state.isOpen) return null;

  // 'choice' type: render a custom buttons array [ { label, onClick, className } ]
  const isChoice = state.type === 'choice' && Array.isArray(state.buttons);

  return (
    <div className="dialog-overlay">
      <div className="dialog-content">
        <h3 className="dialog-title">{state.title || (state.type === 'confirm' ? 'Conferma' : 'Avviso')}</h3>
        <p className="dialog-message">{state.message}</p>
        <div className={`dialog-actions ${isChoice ? 'dialog-actions-col' : ''}`}>
          {isChoice ? (
            state.buttons.map((btn, i) => (
              <button key={i} className={btn.className || 'btn-secondary'} onClick={btn.onClick}>
                {btn.label}
              </button>
            ))
          ) : (
            <>
              {state.type === 'confirm' && (
                <button className="btn-secondary" onClick={state.onCancel}>Annulla</button>
              )}
              <button className="btn-primary" onClick={state.onConfirm}>OK</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
