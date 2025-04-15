import React, { useState, useEffect, useCallback } from 'react';
import { tagService } from '../../services/tagService';

const TagSelector = ({ selectedTags: initialSelectedTags = [], onTagsSelected, mode = 'profile' }) => {
  const _MODE = mode;

  const [supercategories, setSupercategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSupercategories, setExpandedSupercategories] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [localSelectedTags, setLocalSelectedTags] = useState(initialSelectedTags);
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
        console.log("Available tag structure:", response);
        
        // // Add detailed logging to see the full structure with actual IDs
        // console.log("FULL TAG STRUCTURE:", JSON.stringify(response, null, 2));
        
        // // Log the first tag from each category for quick debugging
        // if (response && response.length > 0) {
        //   response.forEach(supercat => {
        //     if (supercat.categories && supercat.categories.length > 0) {
        //       supercat.categories.forEach(category => {
        //         if (category.tags && category.tags.length > 0) {
        //           console.log(`Sample tag from ${supercat.name} > ${category.name}:`, 
        //             `ID: ${category.tags[0].id}, Name: ${category.tags[0].name}`);
        //         }
        //       });
        //     }
        //   });
        // }
        
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

  // Update localSelectedTags when initialSelectedTags prop changes
  useEffect(() => {
    if (initialSelectedTags) {
      setLocalSelectedTags(initialSelectedTags);
    }
  }, [initialSelectedTags]);

  // Call parent callback when localSelectedTags changes
  useEffect(() => {
    if (onTagsSelected) {
      onTagsSelected(localSelectedTags);
    }
  }, [localSelectedTags, onTagsSelected]);

  const toggleTagSelection = useCallback((tagId) => {
    const numericTagId = parseInt(tagId, 10);
    console.log(`Toggling tag with ID: ${tagId} (numeric: ${numericTagId})`);
    
    setLocalSelectedTags((prevSelectedTags) => {
      const isSelected = prevSelectedTags.includes(numericTagId);
      let newSelectedTags;
      
      if (isSelected) {
        newSelectedTags = prevSelectedTags.filter((id) => id !== numericTagId);
      } else {
        newSelectedTags = [...prevSelectedTags, numericTagId];
      }
      
      console.log("Updated selected tags:", newSelectedTags);
      return newSelectedTags;
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

  const handleAddTag = useCallback(async () => {
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
      setLocalSelectedTags((prevSelectedTags) => {
        const updatedSelectedTags = [...prevSelectedTags, newTagId];
        return updatedSelectedTags;
      });

      setShowAddTagModal(false);
      setNewTagName('');
      setSelectedCategoryId('');
      setSelectedSupercategoryId('');
    } catch (error) {
      console.error('Error creating tag:', error);
      alert(`Failed to create tag: ${error.message || 'Unknown error'}`);
    }
  }, [newTagName, selectedCategoryId, selectedSupercategoryId]);

  // Debounced search query update
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

  const debugTags = () => {
    console.log("Current loaded tags:", supercategories);
    console.log("Currently selected tags:", localSelectedTags);
  };

  if (loading) return <div>Loading tags...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search tags..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="input input-bordered w-full mr-2"
        />
        <button onClick={() => setShowAddTagModal(true)} className="btn btn-primary">
          Add Tag
        </button>
      </div>

      {import.meta.env.DEV && (
        <button 
          type="button" 
          className="btn btn-sm btn-ghost text-xs" 
          onClick={debugTags}
        >
          Debug Tags
        </button>
      )}

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
                      {category.tags.map((tag) => {
                        const tagId = parseInt(tag.id, 10);
                        return (
                          <div key={tagId} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={localSelectedTags.includes(tagId)}
                              onChange={() => toggleTagSelection(tagId)}
                              className="mr-2"
                            />
                            <span className="flex-grow">{tag.name} (ID: {tagId})</span>
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