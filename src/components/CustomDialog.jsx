import React from 'react';

export function CustomDialog({ state }) {
  const [inputValue, setInputValue] = React.useState('');

  React.useEffect(() => {
    if (state.type === 'prompt') {
      setInputValue(state.initialValue || '');
    }
  }, [state.isOpen, state.type, state.initialValue]);

  if (!state || !state.isOpen) return null;

  const isChoice = state.type === 'choice' && Array.isArray(state.buttons);

  return (
    <div className="dialog-overlay">
      <div className="dialog-content" style={{ maxWidth: state.type === 'prompt' ? '500px' : '400px' }}>
        <h3 className="dialog-title">{state.title || (state.type === 'confirm' ? 'Conferma' : 'Avviso')}</h3>
        <p className="dialog-message">{state.message}</p>
        
        {state.type === 'prompt' && (
          <textarea 
            className="dialog-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            style={{ 
              width: '100%', minHeight: '150px', marginBottom: '1.5rem', 
              fontFamily: 'monospace', fontSize: '0.85rem'
            }}
            placeholder="Incolla qui il JSON..."
          />
        )}

        <div className={`dialog-actions ${isChoice ? 'dialog-actions-col' : ''}`}>
          {isChoice ? (
            state.buttons.map((btn, i) => (
              <button key={i} className={btn.className || 'btn-secondary'} onClick={btn.onClick}>
                {btn.label}
              </button>
            ))
          ) : (
            <>
              {(state.type === 'confirm' || state.type === 'prompt') && (
                <button className="btn-secondary" onClick={state.onCancel}>Annulla</button>
              )}
              <button 
                className="btn-primary" 
                onClick={() => state.onConfirm(state.type === 'prompt' ? inputValue : undefined)}
              >
                OK
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
