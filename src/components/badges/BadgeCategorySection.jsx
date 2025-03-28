import React from 'react';
import BadgeCard from './BadgeCard';

const BadgeCategorySection = ({ category, badges }) => {
  // Get the first badge's color for the category header
  const categoryColor = badges[0]?.color || '#6B7280';
  
  return (
    <div className="mb-12">
      <h2 
        className="text-xl font-bold mb-4 pb-2 border-b-2" 
        style={{ borderColor: categoryColor, color: categoryColor }}
      >
        {category}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {badges.map(badge => (
          <BadgeCard key={badge.id} badge={badge} />
        ))}
      </div>
    </div>
  );
};

export default BadgeCategorySection;