import React, { useState, useEffect } from 'react';
import { tagService } from '../../services/tagService';

const TagSelector = ({ onTagsSelected, selectedTags = [] }) => {
  const [supercategories, setSupercategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSupercategories, setExpandedSupercategories] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [localSelectedTags, setLocalSelectedTags] = useState(selectedTags);
  const [experienceLevels, setExperienceLevels] = useState({});
  const [interestLevels, setInterestLevels] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddTagModal, setShowAddTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupercategory, setSelectedSupercategory] = useState('');

  // Fetch structured tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoading(true);
        const response = await tagService.getStructuredTags();
        setSupercategories(response);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching tags:', error);
        setLoading(false);
      }
    };

    fetchTags();
  }, []);

  // Update parent component when tags change
  useEffect(() => {
    if (onTagsSelected) {
      onTagsSelected(localSelectedTags, experienceLevels, interestLevels);
    }
  }, [localSelectedTags, experienceLevels, interestLevels]);

  const toggleTagSelection = (tagId) => {
    setLocalSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );

    // Initialize levels if not set
    if (!experienceLevels[tagId]) {
      setExperienceLevels(prev => ({
        ...prev,
        [tagId]: 'beginner'
      }));
    }

    if (!interestLevels[tagId]) {
      setInterestLevels(prev => ({
        ...prev,
        [tagId]: 'medium'
      }));
    }
  };

  const handleExperienceLevelChange = (tagId, level) => {
    setExperienceLevels(prev => ({
      ...prev,
      [tagId]: level
    }));
  };

  const handleInterestLevelChange = (tagId, level) => {
    setInterestLevels(prev => ({
      ...prev,
      [tagId]: level
    }));
  };

  const toggleSupercategory = (name) => {
    setExpandedSupercategories(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const toggleCategory = (name) => {
    setExpandedCategories(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleAddTag = async () => {
    if (!newTagName || !selectedCategory || !selectedSupercategory) {
      alert('Please provide a name, category, and supercategory for the new tag');
      return;
    }

    try {
      const newTag = await tagService.createTag({
        name: newTagName,
        category: selectedCategory,
        supercategory: selectedSupercategory
      });

      // Add the new tag to selected tags
      toggleTagSelection(newTag.id);

      // Close modal and reset fields
      setShowAddTagModal(false);
      setNewTagName('');
      setSelectedCategory('');
      setSelectedSupercategory('');
    } catch (error) {
      console.error('Error creating tag:', error);
      alert('Failed to create tag');
    }
  };

  const filteredSupercategories = supercategories.filter(supercat => 
    supercat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supercat.categories.some(cat => 
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.tags.some(tag => 
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
  );

  if (loading) {
    return <div>Loading tags...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input input-bordered w-full mr-2"
        />
        <button 
          onClick={() => setShowAddTagModal(true)}
          className="btn btn-primary"
        >
          Add Tag
        </button>
      </div>

      {filteredSupercategories.map(supercat => (
        <div key={supercat.id} className="border rounded-lg">
          <div 
            onClick={() => toggleSupercategory(supercat.name)}
            className="p-3 bg-base-200 cursor-pointer flex justify-between items-center"
          >
            <span className="font-semibold">{supercat.name}</span>
            <span>{expandedSupercategories[supercat.name] ? '▼' : '►'}</span>
          </div>

          {expandedSupercategories[supercat.name] && (
            <div className="p-3">
              {supercat.categories.map(category => (
                <div key={category.id} className="mb-3">
                  <div 
                    onClick={() => toggleCategory(category.name)}
                    className="font-medium mb-2 cursor-pointer flex justify-between items-center"
                  >
                    <span>{category.name}</span>
                    <span>{expandedCategories[category.name] ? '▼' : '►'}</span>
                  </div>

                  {expandedCategories[category.name] && (
                    <div className="ml-4 space-y-2">
                      {category.tags.map(tag => (
                        <div key={tag.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={localSelectedTags.includes(tag.id)}
                            onChange={() => toggleTagSelection(tag.id)}
                            className="mr-2"
                          />
                          <span className="flex-grow">{tag.name}</span>
                          
                          {localSelectedTags.includes(tag.id) && (
                            <div className="flex space-x-2">
                              <select
                                value={experienceLevels[tag.id] || 'beginner'}
                                onChange={(e) => handleExperienceLevelChange(tag.id, e.target.value)}
                                className="select select-bordered select-xs w-full max-w-xs"
                              >
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                                <option value="expert">Expert</option>
                              </select>
                              <select
                                value={interestLevels[tag.id] || 'medium'}
                                onChange={(e) => handleInterestLevelChange(tag.id, e.target.value)}
                                className="select select-bordered select-xs w-full max-w-xs"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="very-high">Very High</option>
                              </select>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {showAddTagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-bold mb-4">Add New Tag</h3>
            <input
              type="text"
              placeholder="Tag Name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="input input-bordered w-full mb-2"
            />
            <select
              value={selectedSupercategory}
              onChange={(e) => setSelectedSupercategory(e.target.value)}
              className="select select-bordered w-full mb-2"
            >
              <option value="">Select Supercategory</option>
              {supercategories.map(supercat => (
                <option key={supercat.id} value={supercat.name}>
                  {supercat.name}
                </option>
              ))}
            </select>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="select select-bordered w-full mb-4"
              disabled={!selectedSupercategory}
            >
              <option value="">Select Category</option>
              {selectedSupercategory && 
                supercategories
                  .find(s => s.name === selectedSupercategory)
                  ?.categories.map(cat => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))
              }
            </select>
            <div className="flex justify-end space-x-2">
              <button 
                onClick={() => setShowAddTagModal(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddTag}
                className="btn btn-primary"
              >
                Add Tag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagSelector;