import React from 'react';
import PageContainer from '../components/layout/PageContainer';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import Card from '../components/common/Card';
import Input from '../components/common/Input';

const DesignSystem = () => {
  return (
    <PageContainer title="Design System">
      <div className="space-y-10">
        {/* Typography */}
        <section>
          <h2 className="text-2xl font-bold mb-4 text-secondary">Typography</h2>
          <div className="grid gap-2">
            <h1 className="text-4xl font-bold">Heading 1</h1>
            <h2 className="text-3xl font-bold">Heading 2</h2>
            <h3 className="text-2xl font-bold">Heading 3</h3>
            <h4 className="text-xl font-bold">Heading 4</h4>
            <p className="text-base">Regular paragraph text</p>
            <p className="text-sm">Small text</p>
            <a href="#" className="link link-primary">Primary Link</a>
          </div>
        </section>
        
        {/* Colors */}
        <section>
          <h2 className="text-2xl font-bold mb-4 text-secondary">Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-primary text-primary-content rounded-box">Primary</div>
            <div className="p-4 bg-secondary text-secondary-content rounded-box">Secondary</div>
            <div className="p-4 bg-accent text-accent-content rounded-box">Accent</div>
            <div className="p-4 bg-neutral text-neutral-content rounded-box">Neutral</div>
            <div className="p-4 bg-base-100 border rounded-box">Base 100</div>
            <div className="p-4 bg-base-200 rounded-box">Base 200</div>
            <div className="p-4 bg-base-300 rounded-box">Base 300</div>
            <div className="p-4 bg-info text-info-content rounded-box">Info</div>
            <div className="p-4 bg-success text-success-content rounded-box">Success</div>
            <div className="p-4 bg-warning text-warning-content rounded-box">Warning</div>
            <div className="p-4 bg-error text-error-content rounded-box">Error</div>
          </div>
        </section>
        
        {/* Buttons */}
        <section>
          <h2 className="text-2xl font-bold mb-4 text-secondary">Buttons</h2>
          <div className="flex flex-wrap gap-2">
            <Button>Default</Button>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" size="lg">Large</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
        </section>
        
        {/* Alerts */}
        <section>
          <h2 className="text-2xl font-bold mb-4 text-secondary">Alerts</h2>
          <div className="space-y-2">
            <Alert type="info" message="This is an info message" />
            <Alert type="success" message="This is a success message" />
            <Alert type="warning" message="This is a warning message" />
            <Alert type="error" message="This is an error message" />
          </div>
        </section>
        
        {/* Cards */}
        <section>
          <h2 className="text-2xl font-bold mb-4 text-secondary">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Basic Card">
              <p>This is the content of a basic card using your Card component.</p>
            </Card>
            
            <Card title="Card with Footer" footer={<Button variant="primary">Action</Button>}>
              <p>This card has a footer with an action button.</p>
            </Card>
          </div>
        </section>
        
        {/* Form Elements */}
        <section>
          <h2 className="text-2xl font-bold mb-4 text-secondary">Form Elements</h2>
          <div className="grid gap-4 max-w-md">
            <Input
              label="Text Input"
              name="example"
              placeholder="Enter some text"
            />
            <Input
              type="password"
              label="Password"
              name="password"
              placeholder="Enter password"
            />
            <Input
              label="With Error"
              name="error-example"
              error="This field has an error"
            />
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Checkbox</span>
                <input type="checkbox" className="checkbox" />
              </label>
            </div>
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Toggle</span>
                <input type="checkbox" className="toggle" />
              </label>
            </div>
          </div>
        </section>
      </div>
    </PageContainer>
  );
};

export default DesignSystem;