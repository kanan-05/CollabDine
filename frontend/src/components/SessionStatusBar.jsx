import React, { useState } from 'react';
import { Crown, CreditCard, UserPlus, Users, ChevronDown, Check } from 'lucide-react';

export default function SessionStatusBar({
  session,
  currentMember,
  onInitiateCheckout,
  onTransferHost,
  ordersCount,
  onOpenQr
}) {
  const [showTransferDropdown, setShowTransferDropdown] = useState(false);

  if (!session || !currentMember) return null;

  const isHost = currentMember.isHost;
  const isCheckout = session.status === 'checkout';
  const otherMembers = session.members.filter((m) => m.id !== currentMember.id);

  return (
    <div className="session-status-bar">
      <div className="bar-left">
        <div className="table-tag">
          <span className="live-dot"></span>
          <strong>Table #{session.tableNumber}</strong>
          <span className="session-id-pill">Session #{session.id}</span>
        </div>

        <div className="members-cluster">
          <span className="members-title">
            <Users size={15} />
            <span>{session.members.length} {session.members.length === 1 ? 'Diner' : 'Diners'}:</span>
          </span>
          <div className="member-chips-row">
            {session.members.map((m) => {
              const isCurrent = m.id === currentMember.id;
              const hasNameDuplicate =
                session.members.filter((x) => x.name.trim().toLowerCase() === m.name.trim().toLowerCase()).length > 1;
              const displayName =
                hasNameDuplicate && m.phone && m.phone !== 'Guest'
                  ? `${m.name} (..${m.phone.slice(-4)})`
                  : m.name;

              return (
                <div
                  key={m.id}
                  className={`member-chip ${m.isHost ? 'host-chip' : ''} ${isCurrent ? 'current-chip' : ''}`}
                >
                  {m.isHost && <Crown size={12} className="crown-icon" />}
                  <span>{displayName}</span>
                  {isCurrent && <span className="you-badge">(You)</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bar-right">
        <button className="qr-invite-btn" onClick={onOpenQr} title="Show Table QR to invite friends">
          <UserPlus size={16} />
          <span>Invite / QR</span>
        </button>

        {isHost && (
          <div className="host-actions">
            {otherMembers.length > 0 && (
              <div className="transfer-host-wrapper">
                <button
                  className="secondary-action-btn"
                  onClick={() => setShowTransferDropdown(!showTransferDropdown)}
                >
                  <Crown size={14} />
                  <span>Transfer Host</span>
                  <ChevronDown size={14} />
                </button>

                {showTransferDropdown && (
                  <div className="transfer-dropdown">
                    <div className="dropdown-label">Pass host privileges to:</div>
                    {otherMembers.map((m) => {
                      const hasNameDuplicate =
                        session.members.filter((x) => x.name.trim().toLowerCase() === m.name.trim().toLowerCase()).length > 1;
                      const displayName =
                        hasNameDuplicate && m.phone && m.phone !== 'Guest'
                          ? `${m.name} (..${m.phone.slice(-4)})`
                          : m.name;

                      return (
                        <button
                          key={m.id}
                          className="dropdown-item"
                          onClick={() => {
                            onTransferHost(m.id);
                            setShowTransferDropdown(false);
                          }}
                        >
                          <span>{displayName}</span>
                          <Check size={14} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <button
              className={`checkout-btn ${isCheckout ? 'in-checkout' : ''}`}
              onClick={onInitiateCheckout}
              disabled={ordersCount === 0 && !isCheckout}
            >
              <CreditCard size={16} />
              <span>{isCheckout ? 'View Bill / Pay' : 'Checkout & Split Bill'}</span>
            </button>
          </div>
        )}

        {!isHost && isCheckout && (
          <button className="checkout-btn view-bill-btn" onClick={onInitiateCheckout}>
            <CreditCard size={16} />
            <span>View & Pay Bill</span>
          </button>
        )}
      </div>
    </div>
  );
}
