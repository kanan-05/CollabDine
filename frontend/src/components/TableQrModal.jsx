import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, X, Copy, Check, ExternalLink, Smartphone } from 'lucide-react';

export default function TableQrModal({ isOpen, onClose, currentTable, onSelectTable, localIp }) {
  const [copied, setCopied] = useState(false);
  const [selectedTable, setSelectedTable] = useState(currentTable || 1);

  if (!isOpen) return null;

  // Use local network IP if available so phone on same Wi-Fi can open it directly!
  const host = localIp || window.location.hostname;
  const port = window.location.port ? `:${window.location.port}` : '';
  const qrUrl = `${window.location.protocol}//${host}${port}/?table=${selectedTable}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyTable = (num) => {
    setSelectedTable(num);
    if (onSelectTable) {
      onSelectTable(num);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card qr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="icon-badge qr-badge">
              <QrCode size={20} />
            </div>
            <div>
              <h3>Table QR Code</h3>
              <p>Scan with your smartphone camera to join</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Table Selector Pills */}
        <div className="table-tabs">
          {[1, 2, 3, 4, 5, 6].map((num) => (
            <button
              key={num}
              className={`table-tab ${selectedTable === num ? 'active' : ''}`}
              onClick={() => handleApplyTable(num)}
            >
              Table {num}
            </button>
          ))}
        </div>

        {/* QR Code Container */}
        <div className="qr-box">
          <div className="qr-wrapper">
            <QRCodeSVG
              value={qrUrl}
              size={210}
              level="H"
              includeMargin={true}
            />
          </div>
          <div className="qr-table-tag">
            <span>TABLE #{selectedTable}</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="qr-instructions">
          <div className="instruction-step">
            <Smartphone size={16} />
            <span>Open your phone's camera & point at this QR</span>
          </div>
          <div className="instruction-step">
            <span className="step-num">1</span>
            <span>First diner becomes the Table Host</span>
          </div>
          <div className="instruction-step">
            <span className="step-num">2</span>
            <span>Friends scan the same code to join the session</span>
          </div>
        </div>

        {/* URL Box */}
        <div className="url-copy-box">
          <input type="text" readOnly value={qrUrl} />
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="qr-modal-footer">
          <a href={qrUrl} target="_blank" rel="noreferrer" className="open-tab-link">
            <span>Open Table {selectedTable} in new tab</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
