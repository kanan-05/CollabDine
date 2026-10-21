import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Printer, X, ShieldCheck, Download, Award, Sparkles } from 'lucide-react';

export default function OfficialReceiptModal({ isOpen, onClose, receipt }) {
  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const verificationUrl = `https://collabdine.verify/txn/${receipt.transactionId}`;

  return (
    <div className="modal-overlay receipt-modal-overlay" onClick={onClose}>
      <div className="modal-card receipt-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Controls */}
        <div className="receipt-actions-bar no-print">
          <div className="receipt-tag-badge">
            <ShieldCheck size={16} />
            <span>Official Bank Payment Proof</span>
          </div>
          <div className="receipt-btns-group">
            <button className="print-receipt-btn" onClick={handlePrint}>
              <Printer size={16} />
              <span>Print / Save PDF</span>
            </button>
            <button className="close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="receipt-paper" id="printable-receipt">
          {/* Restaurant Header */}
          <div className="receipt-header">
            <div className="receipt-logo">🍽️</div>
            <h2>{receipt.restaurant?.name || 'CollabDine Bistro & Café'}</h2>
            <p className="receipt-tagline">{receipt.restaurant?.tagline || 'Fine Food · Shared Moments'}</p>
            <p className="receipt-address">{receipt.restaurant?.address}</p>
            <div className="receipt-tax-ids">
              <span>GSTIN: <strong>{receipt.restaurant?.gstin || '07AAAAA9876A1Z4'}</strong></span>
              <span> · </span>
              <span>FSSAI: <strong>{receipt.restaurant?.fssai || '10019011000542'}</strong></span>
            </div>
          </div>

          <div className="receipt-divider"></div>

          {/* Verification Badge */}
          <div className="payment-status-badge-box">
            <div className="status-icon-circle">
              <CheckCircle2 size={32} color="#10b981" />
            </div>
            <h3>PAYMENT SETTLED & VERIFIED</h3>
            <p className="auth-stamp">Authorized via NPCI Payment Gateway Sandbox</p>
          </div>

          {/* Transaction Metadata Grid */}
          <div className="receipt-meta-grid">
            <div className="meta-box">
              <span className="meta-lbl">TRANSACTION REF ID</span>
              <strong className="meta-val highlight">{receipt.transactionId}</strong>
            </div>
            <div className="meta-box">
              <span className="meta-lbl">NPCI BANK UTR</span>
              <strong className="meta-val">{receipt.npciUtr || 'UTR429182910482'}</strong>
            </div>
            <div className="meta-box">
              <span className="meta-lbl">DATE & TIME</span>
              <strong className="meta-val">
                {new Date(receipt.payment?.paidAt || Date.now()).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </strong>
            </div>
            <div className="meta-box">
              <span className="meta-lbl">TABLE & SESSION</span>
              <strong className="meta-val">Table #{receipt.dining?.tableNumber} · Session #{receipt.dining?.sessionId}</strong>
            </div>
          </div>

          {/* Payer Details */}
          <div className="receipt-section-box">
            <div className="section-title">PAYER & PAYMENT DETAILS</div>
            <div className="payer-info-row">
              <div className="info-item">
                <span>Diner Name:</span>
                <strong>{receipt.payer?.name}</strong>
              </div>
              <div className="info-item">
                <span>Payment Mode:</span>
                <strong>{receipt.payment?.method}</strong>
              </div>
              <div className="info-item full-width">
                <span>Account / Details:</span>
                <code>{receipt.payment?.details}</code>
              </div>
            </div>

            {receipt.payer?.isLoyal && (
              <div className="loyalty-badge-row">
                <Award size={15} color="#d97706" />
                <span>⭐ Frequent Diner Status (Visit #{receipt.payer?.visitCount} · 15% Loyalty Discount Applied)</span>
              </div>
            )}
          </div>

          {/* Itemized Share Breakdown */}
          <div className="receipt-section-box">
            <div className="section-title">DINING CHARGES BREAKDOWN</div>
            <table className="receipt-items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="text-center">Qty / Share</th>
                  <th className="text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items && receipt.items.length > 0 ? (
                  receipt.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <strong>{item.name}</strong>
                        {item.isShared && (
                          <div className="item-subtext">Shared among {item.shareCount} diners</div>
                        )}
                      </td>
                      <td className="text-center">{item.isShared ? `1/${item.shareCount}` : item.quantity}</td>
                      <td className="text-right">₹{item.isShared ? (item.price / item.shareCount).toFixed(2) : (item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td>Table Dining Share ({receipt.dining?.billingMode?.toUpperCase().replace('_', ' ')})</td>
                    <td className="text-center">1</td>
                    <td className="text-right">₹{receipt.breakdown?.subtotal?.toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Summary */}
          <div className="receipt-totals-box">
            <div className="total-line">
              <span>Subtotal Share</span>
              <span>₹{receipt.breakdown?.subtotal?.toFixed(2)}</span>
            </div>

            {receipt.breakdown?.discount > 0 && (
              <div className="total-line discount-line">
                <span className="discount-label">
                  <Sparkles size={13} />
                  <span>{receipt.breakdown?.discountReason || 'Loyal Diner Reward (15% OFF)'}</span>
                </span>
                <span>-₹{receipt.breakdown?.discount?.toFixed(2)}</span>
              </div>
            )}

            <div className="receipt-divider dashed"></div>

            <div className="total-line grand-total-line">
              <strong>TOTAL AMOUNT PAID</strong>
              <strong>₹{receipt.breakdown?.amountPaid?.toFixed(2)}</strong>
            </div>
          </div>

          {/* Verification QR & Legal Footer */}
          <div className="receipt-footer-verification">
            <div className="qr-and-stamp">
              <div className="verification-qr">
                <QRCodeSVG
                  value={verificationUrl}
                  size={75}
                  level="M"
                />
              </div>
              <div className="stamp-text">
                <span className="stamp-header">DIGITALLY VERIFIED PROOF</span>
                <span className="stamp-sub">Bank Auth Code: {receipt.bankAuthCode || 'AUTH892102'}</span>
                <span className="stamp-sub">RBI / NPCI Unified Sandbox Gateway</span>
              </div>
            </div>

            <p className="legal-notice">
              This is a computer-generated tax and payment receipt issued by CollabDine for academic verification and demonstration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
