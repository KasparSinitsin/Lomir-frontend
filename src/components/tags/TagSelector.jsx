import React, { useState, useEffect, useCallback } from 'react';
import { tagService } from '../../services/tagService';

const TagSelector = ({ 
  selectedTags: initialSelectedTags = [], 
  onTagsSelected, 
  mode = 'profile' 
}) => {
  const [supercategories, setSupercategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSupercategories, setExpandedSupercategories] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [localSelectedTags, setLocalSelectedTags] = useState(
    initialSelectedTags.map(tag => 
      typeof tag === 'number' ? tag : parseInt(tag, 10)
    ).filter(tag => !isNaN(tag))
  );
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoading(true);
        const response = await tagService.getStructuredTags();
        setSupercategories(response);
      } catch (error) {
        console.error('Error fetching tags:', error);
        setSupercategories([]);
      } finally {
        setLoading(false);
      }
    };
  
    fetchTags();
  }, []);

  // Update local selected tags when initial tags change
  useEffect(() => {
    const validTags = initialSelectedTags
      .map(tag => typeof tag === 'number' ? tag : parseInt(tag, 10))
      .filter(tag => !isNaN(tag));
    
    setLocalSelectedTags(validTags);
  }, [initialSelectedTags]);

  // Notify parent of tag changes
  useEffect(() => {
    if (onTagsSelected) {
      onTagsSelected(localSelectedTags);
    }
  }, [localSelectedTags, onTagsSelected]);

  const toggleTagSelection = useCallback((tagId) => {
    const numericTagId = parseInt(tagId, 10);
    
    setLocalSelectedTags((prevSelectedTags) => {
      const isSelected = prevSelectedTags.includes(numericTagId);
      
      if (isSelected) {
        // Remove tag if already selected
        return prevSelectedTags.filter((id) => id !== numericTagId);
      } else {
        // Add tag if not selected
        return [...prevSelectedTags, numericTagId];
      }
    });
  }, []);

  const toggleSupercategory = useCallback((name) => {
    setExpandedSupercategories((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  }, []);

  const toggleCategory = useCallback((name) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  }, []);

  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);
  }, []);

  const filteredSupercategories = supercategories.filter((supercat) =>
    supercat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supercat.categories.some((cat) =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.tags.some((tag) => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  if (loading) return <div>Loading tags...</div>;

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Search tags..."
        value={searchQuery}
        onChange={handleSearchChange}
        className="input input-bordered w-full"
      />

      {filteredSupercategories.map((supercat) => (
        <div key={`supercat-${supercat.id}`} className="border rounded-lg">
          <div
            onClick={() => toggleSupercategory(supercat.name)}
            className="p-3 bg-base-200 cursor-pointer flex justify-between items-center"
          >
            <span className="font-semibold">{supercat.name}</span>
            <span>{expandedSupercategories[supercat.name] ? '▼' : '►'}</span>
          </div>

          {expandedSupercategories[supercat.name] && (
            <div className="p-3">
              {supercat.categories.map((category) => (
                <div key={`category-${category.id}`} className="mb-3">
                  <div
                    onClick={() => toggleCategory(category.name)}
                    className="font-medium mb-2 cursor-pointer flex justify-between items-center"
                  >
                    <span>{category.name}</span>
                    <span>{expandedCategories[category.name] ? '▼' : '►'}</span>
                  </div>

                  {expandedCategories[category.name] && (
                    <div className="ml-4 space-y-2">
                      {category.tags.map((tag) => {
                        const tagId = parseInt(tag.id, 10);
                        return (
                          <div 
                            key={`tag-${tagId}`} 
                            className="flex items-center"
                          >
                            <input
                              type="checkbox"
                              checked={localSelectedTags.includes(tagId)}
                              onChange={() => toggleTagSelection(tagId)}
                              className="mr-2"
                            />
                            <span className="flex-grow">{tag.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TagSelector;