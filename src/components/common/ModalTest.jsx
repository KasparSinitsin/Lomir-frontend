import React, { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";

const ModalTest = () => {
  const [centerModalOpen, setCenterModalOpen] = useState(false);
  const [rightModalOpen, setRightModalOpen] = useState(false);
  const [largeModalOpen, setLargeModalOpen] = useState(false);

  // Test footer with buttons
  const testFooter = (
    <div className="flex justify-end space-x-3">
      <Button variant="ghost" onClick={() => setCenterModalOpen(false)}>
        Cancel
      </Button>
      <Button variant="primary">
        Save
      </Button>
    </div>
  );

  // Test custom header
  const customHeader = (
    <div>
      <h2 className="text-lg font-medium text-primary mb-1">
        Apply to join the Team
      </h2>
      <h3 className="text-xl font-bold text-primary">"Sample Team Name"</h3>
    </div>
  );

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Modal Component Tests</h2>
      
      {/* Test Buttons */}
      <div className="flex flex-wrap gap-4">
        <Button 
          variant="primary" 
          onClick={() => setCenterModalOpen(true)}
        >
          Test Center Modal
        </Button>
        
        <Button 
          variant="secondary" 
          onClick={() => setRightModalOpen(true)}
        >
          Test Right Modal (TeamApplication style)
        </Button>
        
        <Button 
          variant="accent" 
          onClick={() => setLargeModalOpen(true)}
        >
          Test Large Modal
        </Button>
      </div>

      {/* Center Modal Test */}
      <Modal
        isOpen={centerModalOpen}
        onClose={() => setCenterModalOpen(false)}
        title="Test Center Modal"
        footer={testFooter}
        position="center"
        size="default"
      >
        <div className="space-y-4">
          <p>This is a center-positioned modal (like TeamApplicationDetailsModal).</p>
          <p>It should:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Be centered on screen</li>
            <li>Have a backdrop you can click to close</li>
            <li>Have proper scrolling if content is long</li>
            <li>Close with Escape key</li>
          </ul>
          
          {/* Add lots of content to test scrolling */}
          <div className="space-y-4">
            {Array.from({length: 10}, (_, i) => (
              <div key={i} className="bg-base-200 p-4 rounded">
                <h4 className="font-medium">Test Content Block {i + 1}</h4>
                <p>This is test content to make the modal scroll. The header and footer should stay fixed while this content area scrolls smoothly.</p>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Right Modal Test (TeamApplication style) */}
      <Modal
        isOpen={rightModalOpen}
        onClose={() => setRightModalOpen(false)}
        title={customHeader}
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="ghost" onClick={() => setRightModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary">Send Application</Button>
          </div>
        }
        position="right"
        zIndex="z-[60]"
        size="sm"
        modalClassName="border border-base-300"
        hideBackdrop={true}
        closeOnBackdrop={false}
      >
        <div className="space-y-4">
          <p>This is a right-positioned modal (like TeamApplicationModal).</p>
          <p>It should:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Appear on the RIGHT side of screen</li>
            <li>Have NO backdrop</li>
            <li>Have higher z-index (z-[60])</li>
            <li>Have custom two-line header</li>
            <li>Have border styling</li>
          </ul>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">Test textarea:</span>
            </label>
            <textarea 
              className="textarea textarea-bordered h-24" 
              placeholder="This should scroll if the modal content is too long..."
            />
          </div>
          
          {/* Add content to test scrolling */}
          {Array.from({length: 8}, (_, i) => (
            <div key={i} className="bg-base-200/50 p-3 rounded">
              <p>Test content {i + 1} - This content should scroll properly while header and footer stay fixed.</p>
            </div>
          ))}
        </div>
      </Modal>

      {/* Large Modal Test */}
      <Modal
        isOpen={largeModalOpen}
        onClose={() => setLargeModalOpen(false)}
        title={
          <div>
            <h2 className="text-xl font-medium text-primary">Large Modal Test</h2>
            <p className="text-sm text-base-content/70 mt-1">Testing large size (like TeamApplicationsModal)</p>
          </div>
        }
        position="center"
        size="lg"
        maxHeight="max-h-[90vh]"
        minHeight="min-h-[400px]"
      >
        <div className="space-y-4">
          <p>This is a large modal (like TeamApplicationsModal).</p>
          <p>It should be wider than the others and handle lots of content.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({length: 12}, (_, i) => (
              <div key={i} className="bg-base-200/30 rounded-lg border border-base-300 p-4">
                <h4 className="font-medium mb-2">Application {i + 1}</h4>
                <p className="text-sm text-base-content/80">
                  This represents an application item. The modal should scroll smoothly when there are many items like this.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="success">Accept</Button>
                  <Button size="sm" variant="error">Decline</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ModalTest;