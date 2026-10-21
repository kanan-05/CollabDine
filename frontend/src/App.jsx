import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  Utensils,
  QrCode,
  ChefHat,
  Users,
  Smartphone,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

import TableQrModal from './components/TableQrModal';
import SessionJoinCard from './components/SessionJoinCard';
import SessionStatusBar from './components/SessionStatusBar';
import ShareRequestsBanner from './components/ShareRequestsBanner';
import AiChefRecommendations from './components/AiChefRecommendations';
import MenuSection from './components/MenuSection';
import LiveOrdersSection from './components/LiveOrdersSection';
import CheckoutModal from './components/CheckoutModal';
import KitchenStaffView from './components/KitchenStaffView';

import './App.css';

// Socket instance (connects via current host / vite proxy)
const socket = io({
  transports: ['websocket', 'polling']
});

export default function App() {
  // Read table number from URL query (e.g. ?table=2) or default to 1
  const getInitialTable = () => {
    const params = new URLSearchParams(window.location.search);
    const tbl = parseInt(params.get('table'), 10);
    return !isNaN(tbl) && tbl > 0 ? tbl : 1;
  };

  const [tableNumber, setTableNumber] = useState(getInitialTable);
  const [localIp, setLocalIp] = useState('');
  const [viewMode, setViewMode] = useState('diner'); // 'diner' | 'staff'

  const [session, setSession] = useState(null);
  const [existingTableSession, setExistingTableSession] = useState(null);
  const [currentMember, setCurrentMember] = useState(null);
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [shareRequests, setShareRequests] = useState([]);
  const [bill, setBill] = useState(null);

  const [loading, setLoading] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [qrModalTable, setQrModalTable] = useState(tableNumber);

  // Fetch API network info (local Wi-Fi IP for mobile QR codes) & Menu
  useEffect(() => {
    axios
      .get('/api/info')
      .then((res) => {
        if (res.data?.localIp) {
          setLocalIp(res.data.localIp);
        }
      })
      .catch((err) => console.log('Could not fetch server info', err));

    axios
      .get('/api/menu')
      .then((res) => setMenu(res.data))
      .catch((err) => console.error('Failed to load menu', err));
  }, []);

  // Fetch Table Status whenever tableNumber changes
  const checkTableSession = async (tblNum) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/sessions/table/${tblNum}`);
      setExistingTableSession(res.data.session);

      // Check if we have a saved member for this session in storage
      const saved = sessionStorage.getItem(`collabdine_table_${tblNum}`) || localStorage.getItem(`collabdine_table_${tblNum}`);
      if (saved) {
        try {
          const parsedMember = JSON.parse(saved);
          // Verify member exists in the active session
          const activeMember = res.data.session.members?.find((m) => m.id === parsedMember.id);
          if (activeMember) {
            setSession(res.data.session);
            setCurrentMember(activeMember);
            setOrders(res.data.orders || []);
            setShareRequests(res.data.shareRequests || []);
            setBill(res.data.bill || null);
            socket.emit('joinSession', res.data.session.id);
          } else {
            // Member no longer active
            setCurrentMember(null);
          }
        } catch (e) {
          console.error(e);
        }
      }
    } catch (err) {
      // 404 means no active session for this table
      setExistingTableSession(null);
      setSession(null);
      setCurrentMember(null);
      setOrders([]);
      setShareRequests([]);
      setBill(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkTableSession(tableNumber);
  }, [tableNumber]);

  // Socket.IO event listeners
  useEffect(() => {
    socket.on('sessionData', (data) => {
      if (data.session) setSession(data.session);
      if (data.orders) setOrders(data.orders);
      if (data.shareRequests) setShareRequests(data.shareRequests);
      if (data.bill) setBill(data.bill);
    });

    socket.on('sessionUpdated', (updatedSession) => {
      setSession(updatedSession);
      setExistingTableSession(updatedSession);
      // Update host flag for current member if changed
      if (currentMember) {
        const refreshedCurrent = updatedSession.members.find((m) => m.id === currentMember.id);
        if (refreshedCurrent) {
          setCurrentMember(refreshedCurrent);
        }
      }
    });

    socket.on('ordersUpdated', (updatedOrders) => {
      setOrders(updatedOrders || []);
    });

    socket.on('shareRequestsUpdated', (updatedRequests) => {
      setShareRequests(updatedRequests || []);
    });

    socket.on('billUpdated', (updatedBill) => {
      setBill(updatedBill);
    });

    socket.on('tableCleared', ({ tableNumber: clearedTbl }) => {
      if (clearedTbl === tableNumber) {
        sessionStorage.removeItem(`collabdine_table_${clearedTbl}`);
        localStorage.removeItem(`collabdine_table_${clearedTbl}`);
        setSession(null);
        setCurrentMember(null);
        setExistingTableSession(null);
        setOrders([]);
        setShareRequests([]);
        setBill(null);
        checkTableSession(clearedTbl);
      }
    });

    return () => {
      socket.off('sessionData');
      socket.off('sessionUpdated');
      socket.off('ordersUpdated');
      socket.off('shareRequestsUpdated');
      socket.off('billUpdated');
      socket.off('tableCleared');
    };
  }, [currentMember]);

  // Reset / Clear table session
  const handleResetTable = async (tbl = tableNumber) => {
    try {
      setLoading(true);
      await axios.post(`/api/staff/force-clear-table/${tbl}`);
      sessionStorage.removeItem(`collabdine_table_${tbl}`);
      localStorage.removeItem(`collabdine_table_${tbl}`);
      setSession(null);
      setCurrentMember(null);
      setExistingTableSession(null);
      setOrders([]);
      setShareRequests([]);
      setBill(null);
      await checkTableSession(tbl);
    } catch (err) {
      console.error('Failed to reset table', err);
    } finally {
      setLoading(false);
    }
  };

  // Start new dining session as Host
  const handleStartSession = async (name, phone) => {
    try {
      setLoading(true);
      const res = await axios.post('/api/sessions', {
        tableNumber,
        name,
        phone
      });

      const nextSession = res.data.session;
      const nextMember = res.data.member;

      setSession(nextSession);
      setCurrentMember(nextMember);
      sessionStorage.setItem(`collabdine_table_${tableNumber}`, JSON.stringify(nextMember));
      localStorage.setItem(`collabdine_table_${tableNumber}`, JSON.stringify(nextMember));

      socket.emit('joinSession', nextSession.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  // Join existing table session
  const handleJoinSession = async (name, phone) => {
    if (!existingTableSession) return;
    try {
      setLoading(true);
      const res = await axios.post(`/api/sessions/${existingTableSession.id}/join`, {
        name,
        phone
      });

      const nextSession = res.data.session;
      const nextMember = res.data.member;

      setSession(nextSession);
      setCurrentMember(nextMember);
      sessionStorage.setItem(`collabdine_table_${tableNumber}`, JSON.stringify(nextMember));
      localStorage.setItem(`collabdine_table_${tableNumber}`, JSON.stringify(nextMember));

      socket.emit('joinSession', nextSession.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to join session');
    } finally {
      setLoading(false);
    }
  };

  // Host transfer
  const handleTransferHost = async (newHostId) => {
    if (!session || !currentMember?.isHost) return;
    try {
      await axios.post(`/api/sessions/${session.id}/transfer-host`, {
        currentHostId: currentMember.id,
        newHostId
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to transfer host role');
    }
  };

  // Place individual order item
  const handleAddOrder = async (menuItem) => {
    if (!session || !currentMember) return;
    try {
      await axios.post('/api/orders', {
        sessionId: session.id,
        memberId: currentMember.id,
        itemId: menuItem.id,
        quantity: 1
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add item to order');
    }
  };

  // Delete own pending order
  const handleDeleteOrder = async (orderId) => {
    if (!currentMember) return;
    try {
      await axios.delete(`/api/orders/${orderId}`, {
        data: { memberId: currentMember.id }
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Cannot cancel order');
    }
  };

  // Propose a shared dish
  const handleProposeShare = async (menuItem) => {
    if (!session || !currentMember) return;
    try {
      await axios.post(`/api/sessions/${session.id}/share-requests`, {
        memberId: currentMember.id,
        itemId: menuItem.id,
        note: `Who wants to split ${menuItem.name}?`
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to propose shared dish');
    }
  };

  // Join or leave a share proposal
  const handleJoinShare = async (requestId) => {
    if (!session || !currentMember) return;
    try {
      await axios.post(`/api/sessions/${session.id}/share-requests/${requestId}/join`, {
        memberId: currentMember.id
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  // Confirm share proposal and order to kitchen
  const handleConfirmShare = async (requestId) => {
    if (!session || !currentMember) return;
    try {
      await axios.post(`/api/sessions/${session.id}/share-requests/${requestId}/confirm`, {
        memberId: currentMember.id
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to confirm shared order');
    }
  };

  // Cancel share proposal
  const handleCancelShare = async (requestId) => {
    if (!session || !currentMember) return;
    try {
      await axios.delete(`/api/sessions/${session.id}/share-requests/${requestId}`, {
        data: { memberId: currentMember.id }
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel share proposal');
    }
  };

  // Host initiates checkout
  const handleInitiateCheckout = async () => {
    if (!session) return;
    try {
      setLoading(true);
      if (session.status !== 'checkout') {
        const res = await axios.post(`/api/sessions/${session.id}/checkout`, {
          hostId: currentMember.id,
          mode: 'equal'
        });
        setBill(res.data.bill);
      }
      setIsCheckoutModalOpen(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  // Change bill mode
  const handleChangeBillMode = async (mode, designatedPayerId = null) => {
    if (!session || !currentMember?.isHost) return;
    try {
      const res = await axios.post(`/api/sessions/${session.id}/bill-mode`, {
        hostId: currentMember.id,
        mode,
        designatedPayerId
      });
      setBill(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update billing mode');
    }
  };

  // Pay member allocation
  const handlePayAllocation = async (memberId, paymentMethod, paymentPayload) => {
    if (!session) return;
    try {
      setLoading(true);
      const res = await axios.post(`/api/sessions/${session.id}/pay`, {
        memberId,
        paymentMethod,
        upiId: paymentPayload?.upiId || (typeof paymentPayload === 'string' ? paymentPayload : undefined),
        cardDetails: paymentPayload?.cardDetails
      });
      return res.data;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Close session (Host only, and only when fully paid)
  const handleCloseSession = async () => {
    if (!session || !currentMember?.isHost) return;
    try {
      setLoading(true);
      await axios.post(`/api/sessions/${session.id}/close`, {
        hostId: currentMember.id
      });
      setIsCheckoutModalOpen(false);
      sessionStorage.removeItem(`collabdine_table_${tableNumber}`);
      localStorage.removeItem(`collabdine_table_${tableNumber}`);
      setSession(null);
      setCurrentMember(null);
      setOrders([]);
      setShareRequests([]);
      setBill(null);
      setExistingTableSession(null);
      alert('Dining session completed! Table is now free.');
    } catch (err) {
      alert(err.response?.data?.message || 'Could not close session');
    } finally {
      setLoading(false);
    }
  };

  // Switch table from UI
  const handleSelectTable = (num) => {
    setTableNumber(num);
    const url = new URL(window.location);
    url.searchParams.set('table', num);
    window.history.pushState({}, '', url);
  };

  const handleOpenQrForTable = (tblNum) => {
    setQrModalTable(tblNum);
    setIsQrModalOpen(true);
  };

  return (
    <div className="app-layout">
      {/* Top Navigation */}
      <header className="app-navbar">
        <div className="nav-brand">
          <div className="brand-icon">🍽️</div>
          <div className="brand-text">
            <strong>CollabDine</strong>
            <span>Smart Collaborative Dining</span>
          </div>
        </div>

        <div className="nav-actions">
          {/* Table Switcher */}
          <div className="nav-table-selector">
            <span className="selector-label">Table:</span>
            <select
              value={tableNumber}
              onChange={(e) => handleSelectTable(Number(e.target.value))}
              className="table-dropdown"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <option key={num} value={num}>
                  Table #{num}
                </option>
              ))}
            </select>
          </div>

          {/* Show QR Code button */}
          <button
            className="qr-nav-btn"
            onClick={() => handleOpenQrForTable(tableNumber)}
            title="Generate & scan QR code on smartphone"
          >
            <QrCode size={18} />
            <span className="hide-on-mobile">Table QR Code</span>
          </button>

          {/* Switch View Toggle (Diner vs Staff/Kitchen) */}
          <button
            className={`view-toggle-btn ${viewMode === 'staff' ? 'active-staff' : ''}`}
            onClick={() => setViewMode(viewMode === 'diner' ? 'staff' : 'diner')}
          >
            {viewMode === 'diner' ? (
              <>
                <ChefHat size={18} />
                <span className="hide-on-mobile">Kitchen / Staff View</span>
              </>
            ) : (
              <>
                <ArrowLeft size={18} />
                <span>Back to Diner View</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {viewMode === 'staff' ? (
          /* Staff & Kitchen View */
          <KitchenStaffView
            onShowQrForTable={handleOpenQrForTable}
            localIp={localIp}
          />
        ) : !session || !currentMember ? (
          /* Diner Join Flow */
          <div className="join-flow-wrapper">
            <SessionJoinCard
              tableNumber={tableNumber}
              existingSession={existingTableSession}
              onStartSession={handleStartSession}
              onJoinSession={handleJoinSession}
              onResetTable={handleResetTable}
              loading={loading}
            />
          </div>
        ) : (
          /* Active Diner Workspace */
          <div className="dining-session-view">
            {/* Session Status & Members */}
            <SessionStatusBar
              session={session}
              currentMember={currentMember}
              onInitiateCheckout={handleInitiateCheckout}
              onTransferHost={handleTransferHost}
              ordersCount={orders.length}
              onOpenQr={() => handleOpenQrForTable(tableNumber)}
            />

            {/* Dish Share Proposals Banner */}
            <ShareRequestsBanner
              shareRequests={shareRequests}
              currentMember={currentMember}
              isHost={currentMember.isHost}
              onJoinShare={handleJoinShare}
              onConfirmShare={handleConfirmShare}
              onCancelShare={handleCancelShare}
            />

            {/* AI Chef Recommendations */}
            <AiChefRecommendations
              sessionId={session.id}
              ordersCount={orders.length}
              onAddMenuItem={handleAddOrder}
              onProposeShare={handleProposeShare}
            />

            {/* Two Column Layout: Menu on left, Live Cart on right */}
            <div className="dining-grid">
              <div className="menu-column">
                <MenuSection
                  menu={menu}
                  onAddOrder={handleAddOrder}
                  onProposeShare={handleProposeShare}
                  disabled={session.status === 'checkout'}
                />
              </div>

              <div className="orders-column">
                <LiveOrdersSection
                  orders={orders}
                  currentMember={currentMember}
                  onDeleteOrder={handleDeleteOrder}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* QR Code Modal for Phone Scanning */}
      <TableQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        currentTable={qrModalTable}
        onSelectTable={handleSelectTable}
        localIp={localIp}
      />

      {/* Checkout & Smart Split Modal */}
      {session && bill && (
        <CheckoutModal
          isOpen={isCheckoutModalOpen}
          onClose={() => setIsCheckoutModalOpen(false)}
          session={session}
          bill={bill}
          currentMember={currentMember}
          isHost={currentMember?.isHost}
          onChangeBillMode={handleChangeBillMode}
          onPayAllocation={handlePayAllocation}
          onCloseSession={handleCloseSession}
          loading={loading}
        />
      )}

      {/* Footer */}
      <footer className="app-footer">
        <div>
          <strong>CollabDine Platform</strong> — Collaborative Dining & Smart Bill Splitting
        </div>
        <div className="footer-status">
          <span className="pulse-dot"></span>
          <span>Table #{tableNumber} Live Sync Active</span>
        </div>
      </footer>
    </div>
  );
}
