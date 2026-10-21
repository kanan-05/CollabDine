import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, Plus, Users, RefreshCw } from 'lucide-react';

const FILTER_TAGS = [
  { label: '✨ Auto Pairings', value: '' },
  { label: '🍰 Sweet & Dessert', value: 'sweet' },
  { label: '🧊 Drinks & Cooler', value: 'drink' },
];

export default function AiChefRecommendations({
  sessionId,
  ordersCount,
  onAddMenuItem,
  onProposeShare,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');

  const fetchRecommendations = async (customQuery = '') => {
    try {
      setLoading(true);
      const res = await axios.post('/api/ai/recommendations', {
        sessionId,
        query: customQuery,
      });
      setData(res.data);
    } catch (err) {
      console.error('Failed to load AI recommendations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations(selectedTag);
  }, [sessionId, ordersCount, selectedTag]);

  if (!data && loading) {
    return (
      <div className="ai-recommendations-section">
        <div className="ai-rec-loading">
          <Sparkles size={18} className="spin" />
          <span>AI Chef is tailoring recommendations for your table…</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="ai-recommendations-section">
      {/* Header row */}
      <div className="ai-rec-header">
        <div className="ai-label-row">
          <span className="ai-pill">
            <Sparkles size={13} />
            AI CHEF INSIGHTS
          </span>
          <h3>What to Order Next</h3>
        </div>

        <div className="ai-filter-row">
          {FILTER_TAGS.map((tag) => (
            <button
              key={tag.value}
              className={`ai-tag-chip ${selectedTag === tag.value ? 'active' : ''}`}
              onClick={() => setSelectedTag(tag.value)}
            >
              {tag.label}
            </button>
          ))}
          <button
            className="ai-tag-refresh"
            onClick={() => fetchRecommendations(selectedTag)}
            title="Refresh AI suggestions"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* AI reasoning blurb */}
      {data.reasoning && (
        <p className="ai-reasoning">💡 {data.reasoning}</p>
      )}

      {/* Horizontally scrolling card strip */}
      <div className="ai-cards-strip">
        {data.recommendations?.map((item) => (
          <div key={item.id} className="ai-card">
            <div className="ai-card-emoji">{item.image}</div>
            <div className="ai-card-name">{item.name}</div>
            <div className="ai-card-desc">{item.description}</div>
            <div className="ai-card-price">₹{item.price.toFixed(2)}</div>

            <div className="ai-card-actions">
              <button
                className="ai-add-btn"
                onClick={() => onAddMenuItem(item)}
                title="Add to my items"
              >
                <Plus size={13} />
                Add Item
              </button>
              <button
                className="ai-share-btn"
                onClick={() => onProposeShare(item)}
                title="Propose sharing this dish with table"
              >
                <Users size={13} />
                Split
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
