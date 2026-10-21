import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChefHat, QrCode, CheckCircle2, Clock, XCircle, RefreshCw, Layers, Trash2 } from 'lucide-react';

export default function KitchenStaffView({ onShowQrForTable, localIp }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/staff/overview');
      setOverview(res.data);
    } catch (err) {
      console.error('Failed to load staff overview', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 4000);
    return () => clearInterval(interval);
  }, []);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.patch(`/api/orders/${orderId}/status`, { status: newStatus });
      fetchOverview();
    } catch (err) {
      console.error('Failed to update order status', err);
    }
  };

  const forceClearTable = async (tableNumber) => {
    if (!window.confirm(`Force-clear Table #${tableNumber}? This will end the session and remove all orders.`)) return;
    try {
      await axios.post(`/api/staff/force-clear-table/${tableNumber}`);
      fetchOverview();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to clear table');
    }
  };

  return (
    <div className="staff-view-container">
      <div className="staff-header">
        <div className="staff-title-wrap">
          <div className="staff-badge">
            <ChefHat size={18} />
            <span>KITCHEN & RESTAURANT DASHBOARD</span>
          </div>
          <h2>Live Order Flow & Table Management</h2>
        </div>

        <button className="refresh-btn" onClick={fetchOverview} title="Refresh Live Data">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tables Status Grid */}
      <div className="tables-overview-section">
        <h3>
          <Layers size={16} />
          <span>Restaurant Tables & Stable QR Codes</span>
        </h3>
        <p className="section-subtext">
          Click "Show QR" on any table to view or print the QR code for customers to scan from their phones.
        </p>

        <div className="tables-cards-grid">
          {overview?.tables?.map((tbl) => (
            <div
              key={tbl.tableNumber}
              className={`table-monitor-card ${tbl.hasActiveSession ? 'occupied' : 'vacant'}`}
            >
              <div className="table-card-top">
                <span className="table-number-label">Table #{tbl.tableNumber}</span>
                <span className={`status-pill ${tbl.hasActiveSession ? 'active' : 'idle'}`}>
                  {tbl.hasActiveSession ? 'Occupied' : 'Available'}
                </span>
              </div>

              {tbl.hasActiveSession ? (
                <div className="table-card-details">
                  <div className="detail-line">
                    <span>Host:</span>
                    <strong>{tbl.session?.members?.find((m) => m.isHost)?.name || 'Host'}</strong>
                  </div>
                  <div className="detail-line">
                    <span>Diners:</span>
                    <span>{tbl.session?.members?.length || 0} people</span>
                  </div>
                  <div className="detail-line">
                    <span>Orders:</span>
                    <span>{tbl.ordersCount} items</span>
                  </div>
                </div>
              ) : (
                <div className="table-card-empty">
                  <span>No active diners</span>
                </div>
              )}

              <button
                className="view-qr-action-btn"
                onClick={() => onShowQrForTable(tbl.tableNumber)}
              >
                <QrCode size={15} />
                <span>Show QR Code</span>
              </button>

              {tbl.hasActiveSession && (
                <button
                  className="force-clear-btn"
                  onClick={() => forceClearTable(tbl.tableNumber)}
                  title="Force-end this session (staff only)"
                >
                  <Trash2 size={14} />
                  <span>Clear Table</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Kitchen Live Order Queue */}
      <div className="kitchen-queue-section">
        <div className="queue-header">
          <h3>
            <ChefHat size={18} />
            <span>Kitchen Order Queue ({overview?.kitchenQueue?.length || 0})</span>
          </h3>
          <span className="queue-live-pulse">● Live Incoming</span>
        </div>

        {overview?.kitchenQueue?.length === 0 ? (
          <div className="empty-queue-box">
            <CheckCircle2 size={36} color="#10b981" />
            <h4>All Caught Up!</h4>
            <p>No pending kitchen orders at the moment.</p>
          </div>
        ) : (
          <div className="kitchen-queue-grid">
            {overview?.kitchenQueue?.map((item) => (
              <div key={item.id} className={`queue-card status-${item.status}`}>
                <div className="queue-card-header">
                  <span className="queue-item-name">{item.item}</span>
                  <span className="queue-qty-badge">x{item.quantity}</span>
                </div>

                <div className="queue-item-meta">
                  <span>Table #{item.sessionId ? 'Active' : '1'}</span>
                  <span>Ordered by: <strong>{item.memberName}</strong></span>
                  <span className="queue-time">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {item.isShared && (
                  <div className="queue-shared-note">
                    <span>🤝 Shared among: {item.sharedWith?.join(', ')}</span>
                  </div>
                )}

                <div className="queue-actions">
                  {item.status === 'pending' && (
                    <>
                      <button
                        className="kitchen-btn accept-btn"
                        onClick={() => updateOrderStatus(item.id, 'accepted')}
                      >
                        <ChefHat size={14} />
                        <span>Accept</span>
                      </button>
                      <button
                        className="kitchen-btn reject-btn"
                        onClick={() => updateOrderStatus(item.id, 'rejected')}
                      >
                        <XCircle size={14} />
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  {item.status === 'accepted' && (
                    <button
                      className="kitchen-btn prep-btn"
                      onClick={() => updateOrderStatus(item.id, 'preparing')}
                    >
                      <Clock size={14} />
                      <span>Start Cooking</span>
                    </button>
                  )}

                  {item.status === 'preparing' && (
                    <button
                      className="kitchen-btn serve-btn"
                      onClick={() => updateOrderStatus(item.id, 'served')}
                    >
                      <CheckCircle2 size={14} />
                      <span>Mark Served</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
