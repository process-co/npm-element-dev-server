import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';



// This will be dynamically loaded based on the selected element
interface ElementComponent {
  default?: React.ComponentType<any>;
  [key: string]: any;
}

function DevServer() {
  const [ElementComponent, setElementComponent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const [readonly, setReadonly] = useState(false);
  const [value, setValue] = useState<any>({});

  const handleReadonly = () => {
    setReadonly(!readonly);
  }

  useEffect(() => {
    const loadElement = async () => {
      try {

        // Get element path and type from environment variables (passed by CLI)
        const elementPath = import.meta.env.VITE_ELEMENT_PATH;
        const elementType = import.meta.env.VITE_ELEMENT_TYPE || 'action';
        const elementName = import.meta.env.VITE_ELEMENT_NAME;
        const actionSignalKey = import.meta.env.VITE_ACTION_SIGNAL_KEY;
        const propertyKey = import.meta.env.VITE_PROPERTY_KEY;
        const propertyType = import.meta.env.VITE_PROPERTY_TYPE;
        const propertyUIPath = import.meta.env.VITE_PROPERTY_UI_PATH;
        const modulePath = import.meta.env.VITE_MODULE_PATH;
        const uiDirectory = import.meta.env.VITE_UI_DIRECTORY;

        // console.log('Element data:', { 
        //   elementPath, 
        //   elementType, 
        //   elementName, 
        //   actionSignalKey, 
        //   propertyKey, 
        //   propertyType, 
        //   propertyUIPath,
        //   modulePath,
        //   uiDirectory
        // });

        // console.log('Using new module path system:', {
        //   hasModulePath: !!modulePath,
        //   hasUIDirectory: !!uiDirectory,
        //   modulePath,
        //   uiDirectory
        // });

        if (!elementPath) {
          setError('No element path provided. Make sure to run this through the CLI.');
          setLoading(false);
          return;
        }

        // console.log(`Loading element: ${elementName} (${elementType}) from ${elementPath}`);

        // debugger;

        // Use the complete element data from the compatibility module passed via environment variables
        const elementModule = import.meta.env.VITE_ELEMENT_MODULE || {};
        const currentActionSignal = import.meta.env.VITE_CURRENT_ACTION_SIGNAL || {};
        const selectedProperty = import.meta.env.VITE_SELECTED_PROPERTY || {};

        // console.log('Element module from compatibility:', elementModule);
        // console.log('Current action/signal:', currentActionSignal);
        // console.log('Selected property:', selectedProperty);

        // Get actions and signals from the element module
        const actions = elementModule.actions || [];
        const signals = elementModule.signals || [];
        const action = actions.find((a: any) => a.key === actionSignalKey);
        const signal = signals.find((s: any) => s.key === actionSignalKey);

        // console.log('Found action:', action);
        // console.log('Found signal:', signal);

        // Use the current action/signal info for UI path
        let uiPath: string | null = null;
        if (currentActionSignal && currentActionSignal.ui) {
          uiPath = `/element-ui/${currentActionSignal.ui}/src/index.tsx`;
          // console.log('UI path from current action/signal:', uiPath);
        }

        // Try to find the component based on type and key
        let component: any = null;

        // debugger;

        // console.log(`Looking for ${elementType} with key: ${actionSignalKey}`);
        // console.log(`UI Directory from env: ${uiDirectory}`);
        // console.log(`Current action/signal:`, currentActionSignal);

        // Check if we have a selected property from the CLI
        if (selectedProperty && selectedProperty.propertyKey) {
          // console.log(`Selected property: ${selectedProperty.propertyKey} (${selectedProperty.type})`);

          if (selectedProperty.type === 'ui-variant' && selectedProperty.uiPath) {
            // Property has a UI variant - load the UI component
            uiPath = `/element-ui/${selectedProperty.uiPath}/src/index.tsx`;
            // console.log(`🎨 Loading property UI component: ${selectedProperty.propertyKey} from ${uiPath}`);
          } else {
            // Standard property - use the property data as the component
            component = selectedProperty.propertyData;
            // console.log(`📝 Using standard property data for: ${selectedProperty.propertyKey}`, component);
          }
        } else if (currentActionSignal && currentActionSignal.ui) {
          // No specific property selected, but action/signal has UI
          uiPath = `/element-ui/${currentActionSignal.ui}/src/index.tsx`;
          // console.log(`🎯 Action/Signal has UI property: ${currentActionSignal.ui}`);
          // console.log(`🎯 Constructed UI path: ${uiPath}`);
        } else if (elementType === 'action' && actions && actions.length > 0) {
          // Fallback to first action
          const firstAction = actions[0];
          // console.log(`Using first action: ${firstAction?.key}`, firstAction);

          if (firstAction && firstAction.ui) {
            uiPath = `/element-ui/${firstAction.ui}/src/index.tsx`;
            // console.log(`First action has UI path: ${uiPath}`);
          }
        } else if (elementType === 'signal' && signals && signals.length > 0) {
          // Fallback to first signal
          const firstSignal = signals[0];
          // console.log(`Using first signal: ${firstSignal?.key}`, firstSignal);

          if (firstSignal && firstSignal.ui) {
            uiPath = `/element-ui/${firstSignal.ui}/src/index.tsx`;
            // console.log(`First signal has UI path: ${uiPath}`);
          }
        }

        // If we found a UI path, try to load the UI component for the entire action/signal
        if (uiPath) {
          try {
            // console.log(`🎨 Loading UI component for entire ${elementType} from: ${uiPath}`);
            // console.log(`🔍 UI path type: ${typeof uiPath}`);
            // console.log(`🔍 UI path length: ${uiPath.length}`);

            // Import the UI component using the virtual path
            const uiModule = await import(/* @vite-ignore */ uiPath) as ElementComponent;
            // console.log(`📦 UI module loaded:`, uiModule);
            // console.log(`📦 UI module keys:`, Object.keys(uiModule));
            // console.log(`📦 UI module default:`, uiModule.default);

            component = uiModule.default || uiModule;
            // console.log(`✅ Successfully loaded UI component for entire ${elementType}:`, component);
            // console.log(`✅ Component type:`, typeof component);
            // console.log(`✅ Component is function:`, typeof component === 'function');
          } catch (uiError) {
            console.error('❌ Failed to load UI component:', uiError);
            console.error('❌ Error details:', {
              message: uiError.message,
              stack: uiError.stack,
              name: uiError.name
            });
            // Fallback to the action/signal itself
            if (actionSignalKey) {
              const fallbackAction = actions?.find((a: any) => a.key === actionSignalKey);
              const fallbackSignal = signals?.find((s: any) => s.key === actionSignalKey);
              component = fallbackAction || fallbackSignal;
              // console.log(`🔄 Falling back to action/signal metadata:`, component);
            }
          }
        } else if (currentActionSignal) {
          // No UI path found, fallback to the current action/signal data
          component = currentActionSignal;
          // console.log('Using current action/signal as component');
        }

        if (component) {
          setElementComponent(() => component);
        } else {
          setError(`No ${elementType} component found in ${elementName}`);
        }
      } catch (err) {
        console.error('Error loading element:', err);
        setError(`Failed to load element: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };

    loadElement();
  }, []);


  if (loading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h2>Loading Element...</h2>
        <p>Please wait while the element is being loaded.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', color: 'red' }}>
        <h2>Error Loading Element</h2>
        <p>{error}</p>
        <p>Check the console for more details.</p>
      </div>
    );
  }

  if (!ElementComponent) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h2>No Component Found</h2>
        <p>The selected element doesn't have a renderable component.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Element Development Server</h2>

      <h3>Rendered Component</h3>
      <div style={{ marginBottom: '10px' }}>
        <button
          onClick={handleReadonly}
        >
          {readonly ? 'Make Editable' : 'Make Read Only'}
        </button>
      </div>
      <div style={{ border: '2px solid #007acc', padding: '20px', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
        {typeof ElementComponent === 'function' ? (
          <ElementComponent
            value={value}
            onChange={(newValue: any) => setValue(newValue)}
            onBlur={() => console.log('Component onBlur')}
            readonly={readonly}
          />
        ) : React.isValidElement(ElementComponent) ? (
          ElementComponent
        ) : (
          <div style={{ color: '#666', fontStyle: 'italic' }}>
            Component is not a valid React component. Type: {typeof ElementComponent}
            <br />
            <small>This might be the element metadata instead of the UI component.</small>
          </div>
        )}
      </div>
      <div style={{ marginBottom: '10px' }}>
        <h3>Value</h3>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
      <div style={{ border: '1px solid #ccc', padding: '20px', marginTop: '20px', marginBottom: '20px', backgroundColor: '#f8f9fa' }}>
        <h3>Loaded Component Information</h3>
        <p><strong>Element:</strong> {import.meta.env.VITE_ELEMENT_NAME}</p>
        <p><strong>Type:</strong> {import.meta.env.VITE_ELEMENT_TYPE}</p>
        <p><strong>Action/Signal:</strong> {import.meta.env.VITE_ACTION_SIGNAL_KEY}</p>
        <p><strong>Module Path:</strong> {import.meta.env.VITE_ELEMENT_PATH}</p>
        <p><strong>UI Directory:</strong> {import.meta.env.VITE_UI_DIRECTORY || 'Not available'}</p>

        <h3>Component Details</h3>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
          {JSON.stringify(ElementComponent, null, 2)}
        </pre>

      </div>
    </div>
  );
}

// Render the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DevServer />);
}

export default DevServer;