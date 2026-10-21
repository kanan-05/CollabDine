import React, { useState } from 'react';
import axios from 'axios';
import {
  CreditCard,
  X,
  CheckCircle,
  Clock,
  ShieldCheck,
  Crown,
  Users,
  Divide,
  UserCheck,
  AlertCircle,
  Smartphone,
  Lock,
  Sparkles,
  FileText,
  CreditCard as CardIcon,
  Wifi,
  Award,
  RefreshCw
} from 'lucide-react';
import OfficialReceiptModal from './OfficialReceiptModal';

export default function CheckoutModal({
  isOpen,
  onClose,
  session,
  bill,
  currentMember,
  isHost,
  onChangeBillMode,
  onPayAllocation,
  onCloseSession,
  loading
}) {
  const [selectedMethod, setSelectedMethod] = useState('UPI'); // 'UPI' or 'Card'

  // UPI State
  const [upiId, setUpiId] = useState('');
  const [upiError, setUpiError] = useState('');

  // Card State
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(currentMember?.name?.toUpperCase() || '');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardError, setCardError] = useState('');

  // Payment UI flow
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payingMemberId, setPayingMemberId] = useState(null);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState('');
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [togglingLoyalty, setTogglingLoyalty] = useState(false);

  if (!isOpen || !bill) return null;

  const currentAllocation = bill.allocations?.find((a) => a.memberId === currentMember?.id);
  const isAllPaid = bill.status === 'paid' || bill.allocations?.every((a) => a.amount === 0 || a.paid);

  // Common UPI handles
  const upiHandles = ['@okaxis', '@okhdfcbank', '@oksbi', '@okicici', '@paytm', '@ybl'];

  // Detect card brand
  const getCardBrand = (num) => {
    const clean = num.replace(/\s+/g, '');
    if (/^4/.test(clean)) return 'VISA';
    if (/^(5[1-5]|2[2-7])/.test(clean)) return 'MASTERCARD';
    if (/^(34|37)/.test(clean)) return 'AMEX';
    if (/^(60|65|81|82)/.test(clean)) return 'RUPAY';
    return 'DEBIT / CREDIT';
  };

  // Card input auto-formatters
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(formatted);
    setCardError('');
  };

  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 2) {
      raw = raw.slice(0, 2) + '/' + raw.slice(2);
    }
    setExpiryDate(raw);
    setCardError('');
  };

  const handleCvvChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCvv(raw);
    setCardError('');
  };

  const handleFillDemoCard = () => {
    setCardNumber('4532 8920 1204 8821');
    setCardHolder(currentMember?.name ? currentMember.name.toUpperCase() : 'KANAN TAYAL');
    setExpiryDate('12/28');
    setCvv('782');
    setCardError('');
  };

  const handleAppendUpiHandle = (handle) => {
    const currentBase = upiId.includes('@') ? upiId.split('@')[0] : (upiId || (currentMember?.name?.toLowerCase().replace(/\s+/g, '') || 'diner'));
    setUpiId(`${currentBase}${handle}`);
    setUpiError('');
  };

  const handleOpenPayment = (memberId) => {
    setPayingMemberId(memberId);
    setShowPaymentForm(true);
    setPaymentSuccessMsg('');
    setUpiError('');
    setCardError('');

    // Pre-fill user's default identifier
    if (!upiId) {
      const defaultPrefix = currentMember?.name ? currentMember.name.toLowerCase().replace(/\s+/g, '') : 'diner';
      setUpiId(`${defaultPrefix}@okaxis`);
    }
  };

  const handleExecutePayment = async (e) => {
    e.preventDefault();
    if (!payingMemberId) return;

    // Validate UPI
    if (selectedMethod === 'UPI') {
      const cleanUpi = upiId.trim().toLowerCase();
      if (!cleanUpi.includes('@')) {
        setUpiError("A valid UPI ID must contain '@' followed by a bank handle (e.g. name@okaxis or 9876543210@paytm).");
        return;
      }
      const domain = cleanUpi.split('@')[1];
      const emailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
      if (emailDomains.includes(domain)) {
        setUpiError(`'${domain}' is an email domain, not a valid bank UPI handle! Please use a UPI handle like @okhdfcbank, @oksbi, @okaxis, @paytm, or @ybl.`);
        return;
      }
      if (!/^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z0-9]{2,30}$/.test(cleanUpi)) {
        setUpiError("Invalid UPI ID. Please check the spelling and try again.");
        return;
      }
    }

    // Validate Card
    if (selectedMethod === 'Card') {
      const cleanNum = cardNumber.replace(/\s+/g, '');
      if (cleanNum.length < 15 || cleanNum.length > 16) {
        setCardError("Please enter a valid 15 or 16-digit card number.");
        return;
      }
      if (!cardHolder.trim() || cardHolder.trim().length < 3) {
        setCardError("Please enter the cardholder name.");
        return;
      }
      if (!/^(0[1-9]|1[0-2])\/?([2-9][0-9])$/.test(expiryDate)) {
        setCardError("Please enter a valid expiry date in MM/YY format (e.g. 08/28).");
        return;
      }
      if (cvv.length < 3) {
        setCardError("Please enter a valid 3 or 4-digit CVV.");
        return;
      }
    }

    try {
      const res = await onPayAllocation(payingMemberId, selectedMethod, {
        upiId: selectedMethod === 'UPI' ? upiId.trim() : undefined,
        cardDetails: selectedMethod === 'Card' ? {
          cardNumber,
          cardHolder,
          expiryDate,
          cvv
        } : undefined
      });

      setShowPaymentForm(false);
      setPaymentSuccessMsg('Payment successfully authorized & verified with NPCI Gateway!');

      // Fetch official receipt
      if (res?.receipt) {
        setActiveReceipt(res.receipt);
      } else {
        fetchReceipt(session.id, payingMemberId);
      }
    } catch (err) {
      console.error(err);
      if (selectedMethod === 'UPI') {
        setUpiError(err.response?.data?.message || 'Payment failed');
      } else {
        setCardError(err.response?.data?.message || 'Card payment failed');
      }
    }
  };

  const fetchReceipt = async (sessionId, memberId) => {
    try {
      const res = await axios.get(`/api/sessions/${sessionId}/receipt/${memberId}`);
      setActiveReceipt(res.data);
      setIsReceiptModalOpen(true);
    } catch (err) {
      console.error('Could not fetch receipt', err);
    }
  };

  const handleToggleLoyalty = async (memberId) => {
    try {
      setTogglingLoyalty(true);
      await axios.post(`/api/sessions/${session.id}/member/${memberId}/loyalty`);
    } catch (err) {
      alert('Could not toggle loyalty');
    } finally {
      setTogglingLoyalty(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card checkout-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title-wrap">
              <div className="icon-badge checkout-badge">
                <CreditCard size={20} />
              </div>
              <div>
                <h3>Table #{session.tableNumber} Checkout & Split Billing</h3>
                <p>Collaborative payment with real-time settlement</p>
              </div>
            </div>
            <button className="close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          {/* Success Banner */}
          {paymentSuccessMsg && (
            <div className="success-banner-box">
              <div className="success-banner-left">
                <CheckCircle size={20} color="#10b981" />
                <span>{paymentSuccessMsg}</span>
              </div>
              {activeReceipt && (
                <button
                  className="view-proof-receipt-btn"
                  onClick={() => setIsReceiptModalOpen(true)}
                >
                  <FileText size={15} />
                  <span>View Official Proof / Receipt</span>
                </button>
              )}
            </div>
          )}

          {/* Billing Mode Selector (Host only) */}
          {isHost && (
            <div className="billing-mode-section">
              <span className="mode-section-label">SELECT BILLING METHOD (HOST ONLY):</span>
              <div className="mode-options-grid">
                <button
                  className={`mode-btn ${bill.mode === 'equal' ? 'active' : ''}`}
                  onClick={() => onChangeBillMode('equal')}
                >
                  <Divide size={16} />
                  <strong>Equal Split</strong>
                  <span>Even split among {session.members.length} diners</span>
                </button>

                <button
                  className={`mode-btn ${bill.mode === 'by_item' ? 'active' : ''}`}
                  onClick={() => onChangeBillMode('by_item')}
                >
                  <Users size={16} />
                  <strong>By Items + Shared</strong>
                  <span>Pay own items + shared dish splits</span>
                </button>

                <button
                  className={`mode-btn ${bill.mode === 'single' ? 'active' : ''}`}
                  onClick={() => onChangeBillMode('single')}
                >
                  <UserCheck size={16} />
                  <strong>Single Payer</strong>
                  <span>One diner covers the full table</span>
                </button>
              </div>
            </div>
          )}

          {!isHost && (
            <div className="mode-info-notice">
              <span>Billing Method selected by Host: <strong>{bill.mode.toUpperCase().replace('_', ' ')}</strong></span>
            </div>
          )}

          {/* Bill Summary Totals with Loyalty Perks */}
          <div className="bill-summary-card">
            <div className="summary-row">
              <span>Subtotal (Orders)</span>
              <span>₹{bill.subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>GST & Restaurant Service (5%)</span>
              <span>₹{bill.tax.toFixed(2)}</span>
            </div>

            {bill.totalDiscount > 0 && (
              <div className="summary-row discount-summary-row">
                <span className="discount-tag-text">
                  <Sparkles size={14} />
                  <span>Loyal Diner Perks Applied (&gt;2 Visits)</span>
                </span>
                <span className="discount-amount-text">-₹{bill.totalDiscount.toFixed(2)}</span>
              </div>
            )}

            <div className="summary-row total-row">
              <strong>Grand Total Payable</strong>
              <div className="grand-total-right">
                {bill.totalDiscount > 0 && (
                  <span className="strikethrough-original">₹{bill.totalWithoutDiscount.toFixed(2)}</span>
                )}
                <strong>₹{bill.total.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          {/* Member Allocations List */}
          <div className="allocations-section">
            <div className="allocations-header-flex">
              <h4>Diner Shares & Status</h4>
              <span className="allocations-hint">Visits &gt; 2 unlock automatic 15% discount!</span>
            </div>

            <div className="allocations-list">
              {bill.allocations?.map((alloc) => {
                const isCurrent = alloc.memberId === currentMember?.id;
                const canPayThis = isCurrent || isHost;
                const hasNameDuplicate =
                  bill.allocations.filter((a) => a.memberName.trim().toLowerCase() === alloc.memberName.trim().toLowerCase()).length > 1;
                const memberObj = session.members.find((m) => m.id === alloc.memberId);
                const allocDisplayName =
                  hasNameDuplicate && memberObj?.phone && memberObj.phone !== 'Guest'
                    ? `${alloc.memberName} (..${memberObj.phone.slice(-4)})`
                    : alloc.memberName;

                return (
                  <div
                    key={alloc.memberId}
                    className={`allocation-card ${alloc.paid ? 'paid' : 'unpaid'} ${isCurrent ? 'current-alloc' : ''}`}
                  >
                    <div className="alloc-left">
                      <div className="alloc-name">
                        {session.hostId === alloc.memberId && <Crown size={14} color="#f59e0b" />}
                        <strong>{allocDisplayName}</strong>
                        {isCurrent && <span className="you-pill">You</span>}
                      </div>

                      {/* Loyalty Offer Status */}
                      {alloc.isLoyal ? (
                        <div className="loyal-diner-badge">
                          <Award size={13} color="#b45309" />
                          <span>Visit #{alloc.visitCount || 3} · ⭐ 15% Loyal Diner Offer</span>
                        </div>
                      ) : (
                        <div className="regular-diner-text">
                          <span>Visit #{alloc.visitCount || 1}</span>
                        </div>
                      )}

                      {/* Toggle Loyalty for Demo Presentation */}
                      <button
                        className="toggle-loyalty-demo-btn"
                        onClick={() => handleToggleLoyalty(alloc.memberId)}
                        disabled={togglingLoyalty}
                        title="Simulate diner having visited > 2 times to trigger loyalty discount"
                      >
                        <RefreshCw size={11} className={togglingLoyalty ? 'animate-spin' : ''} />
                        <span>{alloc.isLoyal ? 'Remove Offer' : 'Test >2 Visits Offer (15% OFF)'}</span>
                      </button>

                      {alloc.paymentRef && (
                        <div className="txn-ref-box">
                          <span>Ref: {alloc.paymentRef}</span>
                          {alloc.npciUtr && <span> · UTR: {alloc.npciUtr}</span>}
                        </div>
                      )}
                    </div>

                    <div className="alloc-right">
                      <div className="alloc-amount-wrap">
                        {alloc.discountAmount > 0 && (
                          <span className="raw-amount-struck">₹{alloc.rawAmount.toFixed(2)}</span>
                        )}
                        <span className="final-alloc-amount">₹{alloc.amount.toFixed(2)}</span>
                      </div>

                      {alloc.paid ? (
                        <div className="paid-actions-wrap">
                          <span className="paid-status-badge">
                            <CheckCircle size={14} />
                            <span>Paid</span>
                          </span>
                          <button
                            className="receipt-btn-mini"
                            onClick={() => fetchReceipt(session.id, alloc.memberId)}
                            title="View official bank proof & receipt"
                          >
                            <FileText size={13} />
                            <span>Proof</span>
                          </button>
                        </div>
                      ) : (
                        <div className="unpaid-action-wrap">
                          <span className="unpaid-badge">
                            <Clock size={13} />
                            <span>Unpaid</span>
                          </span>
                          {canPayThis && alloc.amount > 0 && (
                            <button
                              className="pay-share-btn"
                              onClick={() => handleOpenPayment(alloc.memberId)}
                            >
                              Pay ₹{alloc.amount.toFixed(2)}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Payment Portal (Validates VPA / Card) */}
          {showPaymentForm && (
            <div className="payment-form-box">
              <div className="payment-form-header">
                <div className="shield-icon">
                  <ShieldCheck size={20} color="#10b981" />
                </div>
                <div>
                  <h4>Payment Gateway Simulation</h4>
                  <p>Secure bank settlement & proof generator</p>
                </div>
              </div>

              <form onSubmit={handleExecutePayment}>
                {/* Method Switcher */}
                <div className="method-tabs">
                  <button
                    type="button"
                    className={`method-tab ${selectedMethod === 'UPI' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedMethod('UPI');
                      setUpiError('');
                    }}
                  >
                    <Smartphone size={16} />
                    <span>UPI (GPay / PhonePe / Paytm)</span>
                  </button>
                  <button
                    type="button"
                    className={`method-tab ${selectedMethod === 'Card' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedMethod('Card');
                      setCardError('');
                    }}
                  >
                    <CreditCard size={16} />
                    <span>Debit / Credit Card</span>
                  </button>
                </div>

                {/* UPI Interface */}
                {selectedMethod === 'UPI' ? (
                  <div className="upi-payment-panel">
                    <div className="form-group">
                      <label>Enter UPI Virtual Payment Address (VPA)</label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => {
                          setUpiId(e.target.value);
                          setUpiError('');
                        }}
                        placeholder="e.g. username@okaxis or 9876543210@paytm"
                        required
                        className={upiError ? 'input-error' : ''}
                      />
                    </div>

                    {/* Quick Handle Suggestions */}
                    <div className="upi-handles-row">
                      <span className="handles-lbl">Quick Add Bank Handle:</span>
                      <div className="handles-chips">
                        {upiHandles.map((handle) => (
                          <button
                            key={handle}
                            type="button"
                            className="handle-chip"
                            onClick={() => handleAppendUpiHandle(handle)}
                          >
                            {handle}
                          </button>
                        ))}
                      </div>
                    </div>

                    {upiError && (
                      <div className="form-error-banner">
                        <AlertCircle size={15} />
                        <span>{upiError}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Card Interface with Live Visual Card */
                  <div className="card-payment-panel">
                    {/* Live Credit Card Preview */}
                    <div className="visual-card-preview">
                      <div className="card-preview-top">
                        <div className="card-chip"></div>
                        <Wifi size={18} className="contactless-icon" />
                        <span className="card-brand-badge">{getCardBrand(cardNumber)}</span>
                      </div>

                      <div className="card-preview-number">
                        {cardNumber || '•••• •••• •••• ••••'}
                      </div>

                      <div className="card-preview-bottom">
                        <div className="preview-holder">
                          <span className="preview-lbl">CARDHOLDER</span>
                          <span className="preview-val">{cardHolder || 'DINER NAME'}</span>
                        </div>
                        <div className="preview-expiry">
                          <span className="preview-lbl">EXPIRES</span>
                          <span className="preview-val">{expiryDate || 'MM/YY'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Demo Card Fill Button */}
                    <div className="demo-card-action">
                      <button
                        type="button"
                        className="demo-card-btn"
                        onClick={handleFillDemoCard}
                      >
                        <Sparkles size={13} />
                        <span>Autofill Demo Card for Presentation</span>
                      </button>
                    </div>

                    {/* Card Input Fields */}
                    <div className="card-inputs-grid">
                      <div className="form-group">
                        <label>Card Number (16 Digits)</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          placeholder="4532 0000 0000 0000"
                          maxLength={19}
                          required
                          className={cardError ? 'input-error' : ''}
                        />
                      </div>

                      <div className="form-group">
                        <label>Cardholder Name</label>
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={(e) => {
                            setCardHolder(e.target.value.toUpperCase());
                            setCardError('');
                          }}
                          placeholder="NAME AS ON CARD"
                          required
                        />
                      </div>

                      <div className="card-row-split">
                        <div className="form-group">
                          <label>Expiry (MM/YY)</label>
                          <input
                            type="text"
                            value={expiryDate}
                            onChange={handleExpiryChange}
                            placeholder="08/28"
                            maxLength={5}
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label>CVV / CVC</label>
                          <input
                            type="password"
                            value={cvv}
                            onChange={handleCvvChange}
                            placeholder="•••"
                            maxLength={4}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {cardError && (
                      <div className="form-error-banner">
                        <AlertCircle size={15} />
                        <span>{cardError}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="payment-form-actions">
                  <button type="submit" className="confirm-pay-btn" disabled={loading}>
                    <Lock size={15} />
                    <span>Authorize & Complete Payment</span>
                  </button>
                  <button
                    type="button"
                    className="cancel-pay-btn"
                    onClick={() => setShowPaymentForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Footer Actions */}
          <div className="checkout-footer">
            <div className="closure-rules-notice">
              {isAllPaid ? (
                <span className="all-paid-msg">
                  <CheckCircle size={16} color="#10b981" />
                  <span>All diner shares are settled! The dining session is ready to be closed.</span>
                </span>
              ) : (
                <span className="pending-bill-msg">
                  <AlertCircle size={16} color="#f59e0b" />
                  <span>The dining session cannot end until all shares are paid in full.</span>
                </span>
              )}
            </div>

            {isHost ? (
              <button
                className={`end-session-btn ${isAllPaid ? 'ready-to-close' : 'blocked'}`}
                disabled={!isAllPaid || loading}
                onClick={onCloseSession}
                title={isAllPaid ? 'Officially end session and free table' : 'Pay bill completely to end session'}
              >
                <Crown size={16} />
                <span>{isAllPaid ? 'End Dining Session & Release Table' : 'End Session (Locked until paid)'}</span>
              </button>
            ) : (
              <div className="guest-footer-hint">
                <span>Only the Table Host can officially close this session after all shares are paid.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Official Printable Bank Proof Modal */}
      <OfficialReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receipt={activeReceipt}
      />
    </>
  );
}
