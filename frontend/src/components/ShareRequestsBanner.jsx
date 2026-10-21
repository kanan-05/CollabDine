import React from 'react';
import { Users2, Check, Plus, Trash2, Send } from 'lucide-react';

export default function ShareRequestsBanner({
  shareRequests,
  currentMember,
  isHost,
  onJoinShare,
  onConfirmShare,
  onCancelShare
}) {
  const openRequests = shareRequests.filter((r) => r.status === 'open');

  if (openRequests.length === 0) return null;

  return (
    <div className="share-requests-container">
      <div className="share-requests-header">
        <div className="share-title-wrap">
          <span className="share-icon-pulse">🤝</span>
          <h4>Active Table Dish Splits ({openRequests.length})</h4>
        </div>
        <span className="share-hint">Join a dish to split the cost equally with friends!</span>
      </div>

      <div className="share-cards-grid">
        {openRequests.map((req) => {
          const isParticipant = req.participants.some((p) => p.id === currentMember?.id);
          const isCreator = req.creatorId === currentMember?.id;
          const canConfirm = isCreator || isHost;
          const splitPrice = (req.price / req.participants.length).toFixed(2);

          return (
            <div key={req.id} className="share-card">
              <div className="share-card-top">
                <div className="share-food-info">
                  <span className="share-emoji">{req.image || '🍽️'}</span>
                  <div>
                    <h5>{req.item}</h5>
                    <span className="share-total-price">Total: ₹{req.price.toFixed(2)}</span>
                  </div>
                </div>

                <div className="share-per-person">
                  <span className="per-person-val">₹{splitPrice}</span>
                  <span className="per-person-lbl">each ({req.participants.length} {req.participants.length === 1 ? 'person' : 'people'})</span>
                </div>
              </div>

              <div className="share-note">
                <strong>{req.creatorName}</strong>: "{req.note}"
              </div>

              {/* Participants */}
              <div className="share-participants">
                <span className="participants-lbl">
                  <Users2 size={13} />
                  <span>Joined:</span>
                </span>
                <div className="participants-tags">
                  {req.participants.map((p) => (
                    <span key={p.id} className="participant-tag">
                      {p.name} {p.id === currentMember?.id && '(You)'}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="share-card-actions">
                <button
                  className={`join-split-btn ${isParticipant ? 'already-joined' : ''}`}
                  onClick={() => onJoinShare(req.id)}
                  disabled={isCreator && isParticipant} // Creator cannot leave their own proposal
                >
                  {isParticipant ? (
                    <>
                      <Check size={14} />
                      <span>{isCreator ? "You're in (Host)" : "Joined (Click to Leave)"}</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>Count Me In!</span>
                    </>
                  )}
                </button>

                {canConfirm && (
                  <button
                    className="confirm-share-btn"
                    onClick={() => onConfirmShare(req.id)}
                    title="Send this shared item to kitchen"
                  >
                    <Send size={14} />
                    <span>Order to Kitchen</span>
                  </button>
                )}

                {canConfirm && (
                  <button
                    className="cancel-share-btn"
                    onClick={() => onCancelShare(req.id)}
                    title="Cancel proposal"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
