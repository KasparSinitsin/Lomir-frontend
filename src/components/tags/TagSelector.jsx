import React, { useState, useEffect } from 'react';
import { tagService } from '../../services/tagService';

const TagSelector = ({ onTagsSelected, selectedTags = [], mode = 'profile' }) => {
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
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSupercategoryId, setSelectedSupercategoryId] = useState('');

  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoading(true);
        const response = await tagService.getStructuredTags();
        setSupercategories(response || []);
      } catch (error) {
        console.error('Error fetching tags:', error);
        setSupercategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, []);

  useEffect(() => {
    if (onTagsSelected) {
      if (mode === 'profile') {
        onTagsSelected(localSelectedTags, experienceLevels, interestLevels);
      } else {
        onTagsSelected(localSelectedTags);
      }
    }
  }, [localSelectedTags, experienceLevels, interestLevels, onTagsSelected, mode]);

  const toggleTagSelection = (tagId) => {
    setLocalSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );

    if (mode === 'profile') {
      if (!experienceLevels[tagId]) {
        setExperienceLevels((prev) => ({ ...prev, [tagId]: 'beginner' }));
      }
      if (!interestLevels[tagId]) {
        setInterestLevels((prev) => ({ ...prev, [tagId]: 'medium' }));
      }
    }
  };

  const handleExperienceLevelChange = (tagId, level) => {
    if (mode === 'profile') {
      setExperienceLevels((prev) => ({ ...prev, [tagId]: level }));
    }
  };

  const handleInterestLevelChange = (tagId, level) => {
    if (mode === 'profile') {
      setInterestLevels((prev) => ({ ...prev, [tagId]: level }));
    }
  };

  const toggleSupercategory = (name) => {
    setExpandedSupercategories((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const toggleCategory = (name) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleAddTag = async () => {
    if (!newTagName || !selectedCategoryId || !selectedSupercategoryId) {
      alert('Please fill in all fields for the new tag.');
      return;
    }

    try {
      const newTag = await tagService.createTag({
        name: newTagName,
        category: selectedCategoryId,
        supercategory: selectedSupercategoryId,
      });

      const updatedTags = await tagService.getStructuredTags();
      setSupercategories(updatedTags || []);

      const newTagId = newTag.id;
      const updatedSelectedTags = [...localSelectedTags, newTagId];
      setLocalSelectedTags(updatedSelectedTags);

      if (mode === 'profile') {
        setExperienceLevels((prev) => ({ ...prev, [newTagId]: 'beginner' }));
        setInterestLevels((prev) => ({ ...prev, [newTagId]: 'medium' }));
      }

      setShowAddTagModal(false);
      setNewTagName('');
      setSelectedCategoryId('');
      setSelectedSupercategoryId('');
    } catch (error) {
      console.error('Error creating tag:', error);
      alert('Failed to create tag.');
    }
  };

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
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input input-bordered w-full mr-2"
        />
        <button onClick={() => setShowAddTagModal(true)} className="btn btn-primary">
          Add Tag
        </button>
      </div>

      {filteredSupercategories.map((supercat) => (
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
              {supercat.categories.map((category) => (
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
                      {category.tags.map((tag) => (
                        <div key={tag.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={localSelectedTags.includes(tag.id)}
                            onChange={() => toggleTagSelection(tag.id)}
                            className="mr-2"
                          />
                          <span className="flex-grow">{tag.name}</span>

                          {mode === 'profile' && localSelectedTags.includes(tag.id) && (
  <div className="flex space-x-2 ml-2">
    <select
      value={experienceLevels[tag.id] || 'beginner'}
      onChange={(e) => handleExperienceLevelChange(tag.id, e.target.value)}
      className="select select-bordered select-xs"
    >
      <option value="beginner">Beginner</option>
      <option value="intermediate">Intermediate</option>
      <option value="advanced">Advanced</option>
      <option value="expert">Expert</option>
    </select>
    <select
      value={interestLevels[tag.id] || 'medium'}
      onChange={(e) => handleInterestLevelChange(tag.id, e.target.value)}
      className="select select-bordered select-xs"
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

      {/* Add New Tag Modal */}
      {showAddTagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
            <h3 className="text-lg font-bold mb-4">Add New Tag</h3>
            <input
              type="text"
              placeholder="Tag Name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="input input-bordered w-full mb-2"
            />
            <select
              value={selectedSupercategoryId}
              onChange={(e) => setSelectedSupercategoryId(e.target.value)}
              className="select select-bordered w-full mb-2"
            >
              <option value="">Select Supercategory</option>
              {supercategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
  value={selectedCategoryId}
  onChange={(e) => setSelectedCategoryId(e.target.value)}
  className="select select-bordered w-full mb-4"
  disabled={!selectedSupercategoryId}
>
  <option value="">Select Category</option>
  {(supercategories.find((s) => s.id === selectedSupercategoryId)?.categories || []).map((c) => (
    <option key={c.id} value={c.id}>
      {c.name}
    </option>
  ))}
</select>
            <div className="flex justify-end space-x-2">
              <button className="btn btn-ghost" onClick={() => setShowAddTagModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAddTag}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagSelector;