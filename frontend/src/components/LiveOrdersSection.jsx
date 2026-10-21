import React from 'react';
import { ShoppingBag, Trash2, Clock, ChefHat, CheckCheck, XCircle } from 'lucide-react';

function getStatusBadge(status) {
  switch (status) {
    case 'pending':
      return (
        <span className="order-status-badge status-pending">
          <Clock size={12} />
          <span>Sent to Kitchen</span>
        </span>
      );
    case 'accepted':
      return (
        <span className="order-status-badge status-accepted">
          <ChefHat size={12} />
          <span>Kitchen Accepted</span>
        </span>
      );
    case 'preparing':
      return (
        <span className="order-status-badge status-preparing">
          <ChefHat size={12} />
          <span>Cooking Now</span>
        </span>
      );
    case 'served':
      return (
        <span className="order-status-badge status-served">
          <CheckCheck size={12} />
          <span>Served</span>
        </span>
      );
    case 'rejected':
      return (
        <span className="order-status-badge status-rejected">
          <XCircle size={12} />
          <span>Unavailable</span>
        </span>
      );
    default:
      return null;
  }
}

export default function LiveOrdersSection({ orders, currentMember, onDeleteOrder }) {
  const totalAmount = orders
    .filter((o) => o.status !== 'rejected')
    .reduce((sum, o) => sum + o.price * o.quantity, 0);

  return (
    <section className="live-orders-container">
      {/* Header */}
      <div className="orders-header-row">
        <div>
          <span className="section-badge">LIVE SHARED ORDER</span>
          <h2>Table Activity</h2>
        </div>
        <div className="table-total-pill">
          <span>Total</span>
          <strong>₹{totalAmount.toFixed(2)}</strong>
          <span className="items-count">{orders.length} item{orders.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Empty state */}
      {orders.length === 0 ? (
        <div className="empty-cart-state">
          <div className="empty-cart-icon">
            <ShoppingBag size={36} />
          </div>
          <h3>Table order is empty</h3>
          <p>Browse the menu and add items, or propose a shared dish with friends!</p>
        </div>
      ) : (
        <div className="orders-feed">
          {orders.map((order) => {
            const isOwner = order.memberId === currentMember?.id;
            const canDelete = isOwner && order.status === 'pending';

            const cardClass = [
              'order-card',
              order.isShared ? 'shared-order' : '',
              isOwner && !order.isShared ? 'my-order' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div key={order.id} className={cardClass}>
                {/* Emoji icon */}
                <div className="order-card-icon">
                  {order.image || '🍽️'}
                </div>

                {/* Body */}
                <div className="order-card-body">
                  <div className="order-card-name">
                    {order.isShared && (
                      <span className="shared-tag-badge">🤝 Shared</span>
                    )}
                    {order.item}
                    {order.quantity > 1 && (
                      <span className="order-qty-badge">×{order.quantity}</span>
                    )}
                  </div>
                  <div className="order-card-sub">
                    {order.isShared ? (
                      <>Shared by {order.sharedWith?.join(', ') || order.memberName}</>
                    ) : (
                      <>
                        {isOwner ? (
                          <span className="order-by-you">You</span>
                        ) : (
                          <span>{order.memberName}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Right side */}
                <div className="order-card-right">
                  <span className="order-card-price">
                    ₹{(order.price * order.quantity).toFixed(2)}
                  </span>
                  {getStatusBadge(order.status)}
                  {canDelete && (
                    <button
                      className="delete-order-btn"
                      onClick={() => onDeleteOrder(order.id)}
                      title="Cancel your pending item"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
