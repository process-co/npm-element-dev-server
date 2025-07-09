// src/DevUI.js
import React, { useState, useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import fs from 'fs';
import path from 'path';
import { createServer } from 'vite';
import { fileURLToPath } from 'url';
import { loadElementPointers, autoDetectElement } from '@process.co/compatibility';
import { type IProcessDefinitionUIInfo, importFolderModulesOfType } from '@process.co/elements';

interface ElementItem {
  label: string;
  value: string;
  info: IProcessDefinitionUIInfo;
  path: string;
}

interface ActionSignalItem {
  label: string;
  value: string;
  type: 'action' | 'signal';
  path: string;
  description?: string;
}

interface PropertyItem {
  label: string;
  value: string;
  propertyKey: string;
  type: 'standard' | 'ui-variant';
  uiPath?: string;
  description?: string;
  propertyData?: any;
}

export const DevUI = ({ rootDir }: { rootDir: string }) => {
  const [elements, setElements] = useState<ElementItem[]>([]);
  const [selectedElement, setSelectedElement] = useState<ElementItem | null>(null);
  const [actionsSignals, setActionsSignals] = useState<ActionSignalItem[]>([]);
  const [selectedActionSignal, setSelectedActionSignal] = useState<ActionSignalItem | null>(null);
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<PropertyItem | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'no-elements' | 'error' | 'loading-actions-signals' | 'loading-properties' | 'launching' | 'dev-server-running'>('loading');
  const [step, setStep] = useState<'elements' | 'actions-signals' | 'properties'>('elements');
  const [viteLogs, setViteLogs] = useState<string[]>([]);
  const viteLogsRef = useRef(setViteLogs);
  viteLogsRef.current = setViteLogs;
  const [viteUrl, setViteUrl] = useState<string | null>(null);
  // Add a serverMessage state for display messages
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  // Function to get the actual module path for an action/signal
  const getModulePath = async (elementPath: string, actionSignalKey: string, type: 'action' | 'signal'): Promise<{ modulePath: string; uiDir: string } | null> => {
    try {
      // Get the base directory of the element
      const elementDir = fs.statSync(elementPath).isDirectory()
        ? elementPath
        : path.dirname(elementPath);

      // Determine the folder to look in based on type
      const folderName = type === 'action' ? 'actions' : 'sources';
      const folderPath = path.join(elementDir, folderName);

      // Check if the folder exists
      if (!fs.existsSync(folderPath)) {
        return null;
      }

      // Get all modules of the specific type to find the one with matching key
      const modules = await importFolderModulesOfType(folderName, type, elementDir, ['common']);

      const targetModule = modules.find(module => module.key === actionSignalKey);

      if (!targetModule) {
        return null;
      }

      // The importFolderModulesOfType function already found the module, so we need to get its path
      // We can do this by looking at the module's structure or by scanning the folder
      const subfolders = fs.readdirSync(folderPath).filter(item => {
        const itemPath = path.join(folderPath, item);
        return fs.statSync(itemPath).isDirectory();
      });

      let modulePath = null;
      let moduleDir = null;

      // Look through each subfolder to find the one that contains our module
      for (const subfolder of subfolders) {
        const subfolderPath = path.join(folderPath, subfolder);

        // Look for the module file in this subfolder
        const possibleFiles = [
          `${subfolder}.mjs`,
          `${subfolder}.mts`,
          `${subfolder}.js`,
          `${subfolder}.ts`,
          'index.mjs',
          'index.mts',
          'index.js',
          'index.ts'
        ];

        for (const file of possibleFiles) {
          const filePath = path.join(subfolderPath, file);
          if (fs.existsSync(filePath)) {
            // Import this file to check if it's the right module
            try {
              const { importFromPath } = await import('@process.co/elements');
              const { module } = await importFromPath(filePath);

              // Check if this module has the right key
              if (module.key === actionSignalKey) {
                modulePath = filePath;
                moduleDir = subfolderPath;
                break;
              }
            } catch (importError) {
              // Continue to next file if import fails
              continue;
            }
          }
        }

        if (modulePath) break;
      }

      if (!modulePath) {
        return null;
      }

      // Determine the UI directory
      let uiDir = path.join(elementDir, 'ui');
      if (targetModule && targetModule.ui) {
        uiDir = path.join(elementDir, 'ui', targetModule.ui);
      }

      return { modulePath, uiDir };
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    const loadElements = async () => {
      try {
        // First, check if the target directory itself is a valid element
        try {
          const elementType = await autoDetectElement(rootDir);
          if (elementType !== 'pipedream') { // If it's a valid element type
            const elementInfo = await loadElementPointers(rootDir, elementType);
            setElements([{
              label: `${elementInfo.name} (${elementInfo.elementType})`,
              value: elementInfo.name,
              info: elementInfo,
              path: rootDir
            }]);
            setStatus('ready');
            return;
          }
        } catch (error) {
          // Target directory is not a valid element, continue to scan subdirectories
        }

        // Scan for potential element directories/files
        const entries = fs.readdirSync(rootDir, { withFileTypes: true });
        const potentialElements: string[] = [];

        // Look for directories only (elements are directories, not individual files)
        for (const entry of entries) {
          const entryPath = path.join(rootDir, entry.name);

          if (entry.isDirectory()) {
            // Check if directory contains element files
            try {
              const subEntries = fs.readdirSync(entryPath);
              if (subEntries.some(file =>
                file.endsWith('.mjs') ||
                file.endsWith('.mts') ||
                file.endsWith('.js') ||
                file.endsWith('.ts') ||
                file.endsWith('.tsx') ||
                file.endsWith('.jsx')
              )) {
                potentialElements.push(entryPath);
              }
            } catch (error) {
              // Skip directories we can't read
            }
          }
          // Skip individual files - elements are always directories
        }

        if (potentialElements.length === 0) {
          setStatus('no-elements');
          return;
        }

        // Try to load each potential element
        const loadedElements: ElementItem[] = [];

        for (const elementPath of potentialElements) {
          try {
            const elementInfo = await loadElementPointers(elementPath, 'auto');
            loadedElements.push({
              label: `${elementInfo.name} (${elementInfo.elementType})`,
              value: elementInfo.name,
              info: elementInfo,
              path: elementPath
            });
          } catch (error) {
            // Skip elements that can't be loaded
          }
        }

        if (loadedElements.length > 0) {
          setElements(loadedElements);
          setStatus('ready');
          return;
        } else {
          setStatus('no-elements');
        }
      } catch (error) {
        setStatus('error');
      }
    };

    loadElements();
  }, [rootDir]);

  // React to viteUrl changes to show the banner
  useEffect(() => {
    if (viteUrl && status === 'launching') {
      setStatus('dev-server-running');
    }
  }, [viteUrl, status]);

  // Debug: log all status changes
  useEffect(() => {
    // console.log(`Status changed to: ${status}`);
  }, [status]);

  const launchDevServer = async (element: ElementItem, actionSignal: ActionSignalItem, property: PropertyItem | null) => {
    if (!element) return;

    // Get the actual module path and UI directory for the action/signal
    const moduleInfo = await getModulePath(element.path, actionSignal.value, actionSignal.type);

    if (!moduleInfo) {
      setStatus('error');
      return;
    }

    // Try to find a dev directory or use the element's directory
    const elementDir = fs.statSync(element.path).isDirectory()
      ? element.path
      : path.dirname(element.path);

    const devDir = path.join(elementDir, 'dev');

    // Check if dev directory exists, otherwise use the element directory
    const workingDir = fs.existsSync(devDir) ? devDir : elementDir;

    // Use the internal Vite config from .process directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const internalViteConfig = path.resolve(__dirname, '../.process/vite.config.cjs');

    // Check if user has their own vite config, otherwise use internal one
    const userViteConfig = path.join(workingDir, 'vite.config.js');
    const userViteConfigTs = path.join(workingDir, 'vite.config.ts');

    let configToUse = internalViteConfig;
    if (fs.existsSync(userViteConfig)) {
      configToUse = userViteConfig;
    } else if (fs.existsSync(userViteConfigTs)) {
      configToUse = userViteConfigTs;
    }

    // Load the complete element data from compatibility module
    const elementModule = await loadElementPointers(element.path, 'auto');
    const currentActionSignal = (elementModule.actions as any[])?.find(action => action.key === actionSignal.value) ||
      (elementModule.signals as any[])?.find(signal => signal.key === actionSignal.value);

    // Set process.env variables for Vite config
    process.env.VITE_ELEMENT_PATH = element.path;
    process.env.VITE_ELEMENT_TYPE = actionSignal.type;
    process.env.VITE_ELEMENT_NAME = element.info.name;
    process.env.VITE_ACTION_SIGNAL_KEY = actionSignal.value;
    process.env.VITE_PROPERTY_KEY = property?.propertyKey || '';
    process.env.VITE_PROPERTY_TYPE = property?.type || '';
    process.env.VITE_PROPERTY_UI_PATH = property?.uiPath || '';
    process.env.VITE_MODULE_PATH = moduleInfo.modulePath;
    process.env.VITE_UI_DIRECTORY = moduleInfo.uiDir;


    const viteLogLength = 1;
    // Create Vite server programmatically
    try {
      const vite = await createServer({
        configFile: configToUse,
        root: path.resolve(__dirname, '../.process'), // Use .process directory as root
        optimizeDeps: {
          include: ['react', 'react-dom'],
          exclude: [element.path] // Exclude the external element from optimization
        },
        define: {
          // Pass complete element data directly to Vite
          'import.meta.env.VITE_ELEMENT_PATH': JSON.stringify(element.path),
          'import.meta.env.VITE_ELEMENT_TYPE': JSON.stringify(actionSignal.type),
          'import.meta.env.VITE_ELEMENT_NAME': JSON.stringify(element.info.name),
          'import.meta.env.VITE_ACTION_SIGNAL_KEY': JSON.stringify(actionSignal.value),
          'import.meta.env.VITE_PROPERTY_KEY': JSON.stringify(property?.propertyKey || null),
          'import.meta.env.VITE_PROPERTY_TYPE': JSON.stringify(property?.type || null),
          'import.meta.env.VITE_PROPERTY_UI_PATH': JSON.stringify(property?.uiPath || null),
          // Add the actual module paths
          'import.meta.env.VITE_MODULE_PATH': JSON.stringify(moduleInfo.modulePath),
          'import.meta.env.VITE_UI_DIRECTORY': JSON.stringify(moduleInfo.uiDir),
          // Pass the complete element data from compatibility module
          'import.meta.env.VITE_ELEMENT_MODULE': JSON.stringify(elementModule),
          'import.meta.env.VITE_CURRENT_ACTION_SIGNAL': JSON.stringify(currentActionSignal),
          'import.meta.env.VITE_SELECTED_PROPERTY': JSON.stringify(property)
        },
        logLevel: 'info',
        customLogger: {
          info(msg) { viteLogsRef.current(logs => [...logs, msg].slice(-viteLogLength)); },
          warn(msg) { viteLogsRef.current(logs => [...logs, `[warn] ${msg}`].slice(-viteLogLength)); },
          error(msg) { viteLogsRef.current(logs => [...logs, `[error] ${msg}`].slice(-viteLogLength)); },
          clearScreen() { },
          hasWarned: false,
          warnOnce(msg) { },
          hasErrorLogged: () => false,
        }
      });

      await vite.listen();
      const serverUrl = `http://localhost:${vite.config.server?.port || 5173}`;
      setViteUrl(serverUrl); // <-- set the state
      setServerMessage(`Dev server running at ${serverUrl}`);

      // Keep the server running and handle cleanup
      const cleanup = () => {
        vite.close();
      };

      // Handle process termination
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

      // Handle file changes
      vite.watcher.on('change', (file: string) => {
        // console.log(`File changed: ${file}`);
      });

      // Keep the process alive
      setStatus('dev-server-running');

      // Don't exit - keep the server running
      process.stdin.resume();

    } catch (error: any) {
      setStatus('error');
    }
  };

  const handleSelect = async (item: { value: string }) => {
    if (step === 'elements') {
      // First step: select an element
      const element = elements.find(el => el.value === item.value);
      if (!element) return;

      setSelectedElement(element);
      setStatus('loading-actions-signals');

      try {
        // Load the element to get its actions and signals
        const elementModule = await loadElementPointers(element.path, 'auto');

        const items: ActionSignalItem[] = [];

        // Add actions
        if (elementModule.actions && Array.isArray(elementModule.actions)) {
          elementModule.actions.forEach((action, index) => {
            items.push({
              label: `Action: ${action.name || action.key}`,
              value: action.key,
              type: 'action',
              path: element.path,
              description: action.description
            });
          });
        }

        // Add signals
        if (elementModule.signals && Array.isArray(elementModule.signals)) {
          elementModule.signals.forEach((signal, index) => {
            items.push({
              label: `Signal: ${signal.name || signal.key}`,
              value: signal.key,
              type: 'signal',
              path: element.path,
              description: signal.description
            });
          });
        }

        if (items.length === 0) {
          // If no actions/signals found, create a default item
          items.push({
            label: 'Default Component',
            value: 'default',
            type: 'action',
            path: element.path,
            description: 'Default component from element'
          });
        }

        setActionsSignals(items);
        setStep('actions-signals');
        setStatus('ready');
      } catch (error) {
        setStatus('error');
      }
    } else if (step === 'actions-signals') {
      // Second step: select an action/signal
      const selectedActionSignal = actionsSignals.find(i => i.value === item.value);
      if (!selectedActionSignal || !selectedElement) return;

      setSelectedActionSignal(selectedActionSignal);
      setStatus('loading-properties');

      try {
        // Load the element to get its properties
        const elementModule = await loadElementPointers(selectedElement.path, 'auto');

        const currentActionSignal = (elementModule.actions as any[])?.find(action => action.key === selectedActionSignal.value) ||
          (elementModule.signals as any[])?.find(signal => signal.key === selectedActionSignal.value);

        // Check if the action/signal has its own UI
        if (currentActionSignal && currentActionSignal.ui) {
          setSelected(selectedActionSignal.value);
          setStatus('launching');
          // Launch server without awaiting - let it run in background
          launchDevServer(selectedElement, selectedActionSignal, null).catch(error => {
            setStatus('error');
          });
          return;
        }

        // No UI found, check for properties with UI
        if (!currentActionSignal || !currentActionSignal.props) {
          setSelected(selectedActionSignal.value);
          setStatus('launching');
          try {
            await launchDevServer(selectedElement, selectedActionSignal, null);
          } catch (error) {
            setStatus('error');
          }
          return;
        }

        const propertyItems: PropertyItem[] = [];

        // Add properties that have UI components
        // props is an array, not an object
        currentActionSignal.props.forEach((prop: any) => {
          if (prop.ui) {
            // Property has a UI variant
            propertyItems.push({
              label: `🎨 ${prop.key} (${prop.ui})`,
              value: `ui-${prop.key}`,
              propertyKey: prop.key,
              type: 'ui-variant',
              uiPath: prop.ui,
              description: prop.description,
              propertyData: prop
            });
          }
        });

        if (propertyItems.length === 0) {
          setSelected(selectedActionSignal.value);
          setStatus('launching');
          await launchDevServer(selectedElement, selectedActionSignal, null);
          return;
        }

        setProperties(propertyItems);
        setStep('properties');
        setStatus('ready');
      } catch (error) {
        setStatus('error');
      }
    } else {
      // Third step: select a property (or launch directly)
      const selectedProperty = properties.find(i => i.value === item.value);
      if (!selectedProperty || !selectedActionSignal || !selectedElement) return;

      setSelectedProperty(selectedProperty);
      setSelected(selectedProperty.value);
      setStatus('launching');
      await launchDevServer(selectedElement, selectedActionSignal, selectedProperty);
    }
  };

  if (status === 'loading') {
    return (
      <Box flexDirection="column" marginTop={2}>
        <Text>🔍 Loading elements from: <Text color="cyan">{rootDir}</Text></Text>
        <Text>Loading...</Text>
      </Box>
    );
  }

  if (status === 'no-elements') {
    return (
      <Box flexDirection="column" marginTop={2}>
        <Text color="red">❌ No valid elements found in: <Text color="cyan">{rootDir}</Text></Text>
        <Text color="yellow">Make sure the directory contains valid element modules.</Text>
        <Text color="yellow">Supported formats: Pipedream, n8n, Doflo, Process.co</Text>
        <Text color="yellow">Supported file types: .js, .ts, .mjs, .mts, .jsx, .tsx</Text>
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Box flexDirection="column" marginTop={2}>
        <Text color="red">❌ Error loading elements from: <Text color="cyan">{rootDir}</Text></Text>
        <Text color="yellow">Check that the directory contains valid element modules.</Text>
      </Box>
    );
  }

  if (status === 'loading-actions-signals') {
    return (
      <Box flexDirection="column" marginTop={2}>
        <Text>🔍 Loading actions and signals for '<Text color="cyan">{selectedElement?.info.name}</Text>'...</Text>
        <Text>Loading...</Text>
      </Box>
    );
  }

  if (status === 'loading-properties') {
    return (
      <Box flexDirection="column" marginTop={2}>
        <Text>🔍 Loading properties for '<Text color="cyan">{selectedActionSignal?.label}</Text>'...</Text>
        <Text>Loading...</Text>
      </Box>
    );
  }

  if (status === 'launching') {
    return (
      <Box flexDirection="column" marginTop={2}>
        <Text color="green">🚀 Launching dev server for '<Text color="cyan">{selected}</Text>'...</Text>
        <Text>Directory: <Text color="cyan">{rootDir}</Text></Text>
      </Box>
    );
  }

  if (status === 'dev-server-running') {
    return (
      <>
        <Box flexDirection="column" flexShrink={1} borderStyle={"round"} margin={2} marginBottom={1} paddingX={2} paddingY={1} borderColor="#8759F2" >
          {/* <ViteBanner url={viteUrl} /> */}
          {/* <Text color="green">✅ Dev server is running!</Text> */}
          {/* {serverMessage && <Text>{serverMessage}</Text>} */}
          <Text>Server Running: <Text color="#01D4E7" underline>{viteUrl}</Text></Text>
          <Text>Element: <Text color="#01D4E7">{selectedElement?.info.name}</Text></Text>
          <Text>Action/Signal: <Text color="#01D4E7">{selectedActionSignal?.label}</Text></Text>
          {selectedProperty ? (
            <Text>Property UI: <Text color="#01D4E7">{selectedProperty.label}</Text></Text>
          ) : (
            <Text>UI Mode: <Text color="#01D4E7">Action/Signal Level</Text></Text>
          )}
          <Text color="yellow">Press Ctrl+C to stop the server</Text>
        </Box>
        <Box marginTop={1} marginLeft={4} flexDirection="column">
          <Text color="gray">Server Status:</Text>
          {viteLogs.length > 0 ? (
            viteLogs.map((line, i) => (
              <Text key={i} color="gray">{line}</Text>
            ))
          ) : (
            <Text color="gray">Waiting for activity...</Text>
          )}
        </Box></>

    );
  }

  if (step === 'properties') {
    return (
      <Box flexDirection="column">
        <Text>📁 Element: <Text color="cyan">{selectedElement?.info.name}</Text></Text>
        <Text>📋 Action/Signal: <Text color="#01D4E7">{selectedActionSignal?.label}</Text></Text>
        <Text>Found {properties.length} property(ies):</Text>
        <SelectInput items={properties} onSelect={handleSelect} />
      </Box>
    );
  }

  if (step === 'actions-signals') {
    return (
      <Box flexDirection="column" marginTop={2} marginBottom={2}>
        {/* <Text>Status: {step}</Text> */}
        <Text>📁 Element: <Text color="#01D4E7">{selectedElement?.info.name}</Text></Text>
        <Box flexDirection="column" marginTop={1}>
          <Text>Found {actionsSignals.length} action(s)/signal(s):</Text>
          <SelectInput items={actionsSignals} onSelect={handleSelect} />
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginTop={2} marginBottom={2}>
      {/* <ViteBanner url={viteUrl} /> */}
      <Box flexDirection="column">
        <Text>📁 Directory: <Text color="#01D4E7">{rootDir}</Text></Text>
        <Box flexDirection="column" marginTop={1}>
          <Text>Found {elements.length} element(s):</Text>
          <SelectInput items={elements} onSelect={handleSelect} /></Box>
      </Box>
      <ViteLogPanel logs={viteLogs} />
    </Box>
  );
};

// Vite log panel
const ViteLogPanel = ({ logs }: { logs: string[] }) => {
  if (!logs.length) return null;
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="gray">Output:</Text>
      {logs.map((line, i) => (
        <Text key={i} color="gray">{line}</Text>
      ))}
    </Box>
  );
};

// Vite banner component
const ViteBanner = ({ url }: { url: string | null }) =>
  url ? (
    <Box marginBottom={1} justifyContent="center" borderStyle="double" borderColor="#8759F2" marginX={10}>
      <Text color="green">🚀 Process Element Server running at: </Text>
      <Text color="cyan" underline>{url}</Text>
    </Box>
  ) : null;
