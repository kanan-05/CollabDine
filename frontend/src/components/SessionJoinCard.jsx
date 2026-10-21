import React, { useState } from 'react';
import { Users, Crown, ArrowRight, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';

export default function SessionJoinCard({
  tableNumber,
  existingSession,
  onStartSession,
  onJoinSession,
  onResetTable,
  loading
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const hasSession = Boolean(
    existingSession && (existingSession.status === 'active' || existingSession.status === 'checkout')
  );
  const isCheckout = existingSession?.status === 'checkout';

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();
    if (!cleanName) {
      setError('Please enter your name');
      return;
    }

    if (hasSession) {
      onJoinSession(cleanName, phone.trim());
    } else {
      onStartSession(cleanName, phone.trim());
    }
  };

  const handleReset = () => {
    if (window.confirm(`Clear Table #${tableNumber} and start a brand-new session as Host?`)) {
      onResetTable(tableNumber);
    }
  };

  return (
    <div className="join-card-container">
      <div className="join-card">
        <div className="join-badge">
          <Sparkles size={14} />
          <span>SMART TABLE #{tableNumber}</span>
        </div>

        {hasSession ? (
          <>
            <h2 className="join-title">
              {isCheckout ? `Table #${tableNumber} Checkout` : 'Join Active Dining Session'}
            </h2>
            <p className="join-subtitle">
              {isCheckout
                ? `Table #${tableNumber} is currently at checkout & billing. If this was a previous party, you can clear it below to start a new dining session!`
                : `Table #${tableNumber} has an active dining session. Enter your name to join your friends!`}
            </p>

            {/* Existing session summary */}
            <div className="existing-session-box">
              <div className="box-row">
                <span className="box-label">Table Host:</span>
                <span className="box-val host-val">
                  <Crown size={14} color="#f59e0b" />
                  {existingSession.members?.find((m) => m.isHost)?.name || 'Host'}
                </span>
              </div>
              <div className="box-row">
                <span className="box-label">At Table:</span>
                <div className="members-mini-chips">
                  {existingSession.members?.map((m) => (
                    <span key={m.id} className="mini-chip">
                      {m.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {isCheckout && (
              <div className="checkout-alert-box">
                <div className="checkout-alert-text">
                  ⚠️ This table was in checkout. Finished or previous party? Clear it to start fresh:
                </div>
                <button
                  type="button"
                  className="btn-clear-table-primary"
                  onClick={handleReset}
                  disabled={loading}
                >
                  <RotateCcw size={16} />
                  <span>Clear Table & Start New Session</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="join-title">Welcome to Table #{tableNumber}!</h2>
            <p className="join-subtitle">
              No one is dining at Table #{tableNumber} right now. Enter your name to start the session — you will become the <strong>Table Host</strong> 👑.
            </p>
          </>
        )}

        {/* Join / Start Form */}
        <form onSubmit={handleSubmit} className="join-form">
          <div className="form-group">
            <label htmlFor="customerName">
              {hasSession ? 'Your Name (Join this table)' : 'Your Name (Table Host)'}
            </label>
            <input
              id="customerName"
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="customerPhone">Phone / Contact (Optional, for loyalty rewards)</label>
            <input
              id="customerPhone"
              type="tel"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="join-submit-btn" disabled={loading}>
            {loading ? (
              'Connecting...'
            ) : hasSession ? (
              <>
                <Users size={18} />
                <span>Join Table #{tableNumber} Session</span>
              </>
            ) : (
              <>
                <Crown size={18} />
                <span>Start Table #{tableNumber} as Host</span>
              </>
            )}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Secondary Reset Button if session exists but user wants a fresh table */}
        {hasSession && !isCheckout && (
          <div className="join-alt-action">
            <span>New party at this table?</span>
            <button
              type="button"
              className="btn-link-reset"
              onClick={handleReset}
              disabled={loading}
            >
              Reset Table & Start Fresh
            </button>
          </div>
        )}

        <div className="join-features">
          <div className="feature-item">
            <CheckCircle2 size={16} color="#10b981" />
            <span>Real-time collaborative order</span>
          </div>
          <div className="feature-item">
            <CheckCircle2 size={16} color="#10b981" />
            <span>Split food items with friends</span>
          </div>
          <div className="feature-item">
            <CheckCircle2 size={16} color="#10b981" />
            <span>Smart split bill & direct payment</span>
          </div>
        </div>
      </div>
    </div>
  );
}
