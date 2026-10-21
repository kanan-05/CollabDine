import React, { useState } from 'react';
import { Plus, Users } from 'lucide-react';

const CATEGORIES = ['All', 'Starters', 'Pizza & Mains', 'Beverages', 'Desserts'];

const CATEGORY_ICONS = {
  All: '🍽️',
  Starters: '🥗',
  'Pizza & Mains': '🍕',
  Beverages: '🥤',
  Desserts: '🍰',
};

export default function MenuSection({ menu, onAddOrder, onProposeShare, disabled }) {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredMenu =
    selectedCategory === 'All'
      ? menu
      : menu.filter((item) => item.category === selectedCategory);

  // Group by category for section headers
  const groupedItems =
    selectedCategory === 'All'
      ? CATEGORIES.filter((c) => c !== 'All').reduce((acc, cat) => {
          const items = menu.filter((item) => item.category === cat);
          if (items.length > 0) acc[cat] = items;
          return acc;
        }, {})
      : { [selectedCategory]: filteredMenu };

  return (
    <section className="menu-container">
      {/* Header */}
      <div className="menu-header">
        <div className="menu-title-row">
          <span className="section-badge">RESTAURANT MENU</span>
          <h2>Order For The Table</h2>
        </div>

        {/* Category Tab Pills */}
        <div className="category-tabs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`cat-tab ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              <span>{CATEGORY_ICONS[cat]}</span>
              <span>{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="menu-items-list">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category} className="menu-category-section">
            {/* Category divider (only shown when "All" is selected) */}
            {selectedCategory === 'All' && (
              <div className="menu-category-divider">
                <span className="menu-category-label">
                  {CATEGORY_ICONS[category]} {category}
                </span>
              </div>
            )}

            {items.map((item) => (
              <div key={item.id} className="menu-row">
                {/* Emoji icon */}
                <div className="menu-row-icon">{item.image}</div>

                {/* Name + description */}
                <div className="menu-row-body">
                  <div className="menu-row-name-line">
                    <span className="veg-dot" title="Vegetarian" />
                    <span className="menu-row-name">{item.name}</span>
                  </div>
                  <p className="menu-row-desc">{item.description}</p>
                </div>

                {/* Price + Actions */}
                <div className="menu-row-right">
                  <span className="menu-row-price">₹{item.price.toFixed(2)}</span>
                  <div className="menu-row-actions">
                    <button
                      className="btn-add-item"
                      onClick={() => onAddOrder(item)}
                      disabled={disabled}
                      title="Add to your personal bill"
                    >
                      <Plus size={14} />
                      <span>Add</span>
                    </button>
                    <button
                      className="btn-split-item"
                      onClick={() => onProposeShare(item)}
                      disabled={disabled}
                      title="Invite others at table to split this dish"
                    >
                      <Users size={14} />
                      <span>Split</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
