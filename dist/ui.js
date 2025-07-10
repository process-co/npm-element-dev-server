import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/DevUI.js
import { useState, useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import fs from 'fs';
import path from 'path';
import { createServer } from 'vite';
import { fileURLToPath } from 'url';
import dev_support from '@process.co/element-dev-support';
export const DevUI = ({ rootDir }) => {
    const [elements, setElements] = useState([]);
    const [selectedElement, setSelectedElement] = useState(null);
    const [actionsSignals, setActionsSignals] = useState([]);
    const [selectedActionSignal, setSelectedActionSignal] = useState(null);
    const [properties, setProperties] = useState([]);
    const [selected, setSelected] = useState(null);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [status, setStatus] = useState('loading');
    const [step, setStep] = useState('elements');
    const [viteLogs, setViteLogs] = useState([]);
    const viteLogsRef = useRef(setViteLogs);
    viteLogsRef.current = setViteLogs;
    const [viteUrl, setViteUrl] = useState(null);
    // Add a serverMessage state for display messages
    const [serverMessage, setServerMessage] = useState(null);
    // Function to get the actual module path for an action/signal
    const getModulePath = async (elementPath, actionSignalKey, type) => {
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
            const modules = await dev_support.importFolderModulesOfType(folderName, type, elementDir, ['common']);
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
                            const { module } = await dev_support.importFromPath(filePath);
                            // Check if this module has the right key
                            if (module.key === actionSignalKey) {
                                modulePath = filePath;
                                moduleDir = subfolderPath;
                                break;
                            }
                        }
                        catch (importError) {
                            // Continue to next file if import fails
                            continue;
                        }
                    }
                }
                if (modulePath)
                    break;
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
        }
        catch (error) {
            return null;
        }
    };
    useEffect(() => {
        const loadElements = async () => {
            try {
                // First, check if the target directory itself is a valid element
                try {
                    const elementType = await dev_support.autoDetectElement(rootDir);
                    if (elementType !== 'pipedream') { // If it's a valid element type
                        const elementInfo = await dev_support.loadElementPointers(rootDir, elementType);
                        setElements([{
                                label: `${elementInfo.name} (${elementInfo.elementType})`,
                                value: elementInfo.name,
                                info: elementInfo,
                                path: rootDir
                            }]);
                        setStatus('ready');
                        return;
                    }
                }
                catch (error) {
                    // Target directory is not a valid element, continue to scan subdirectories
                }
                // Scan for potential element directories/files
                const entries = fs.readdirSync(rootDir, { withFileTypes: true });
                const potentialElements = [];
                // Look for directories only (elements are directories, not individual files)
                for (const entry of entries) {
                    const entryPath = path.join(rootDir, entry.name);
                    if (entry.isDirectory()) {
                        // Check if directory contains element files
                        try {
                            const subEntries = fs.readdirSync(entryPath);
                            if (subEntries.some(file => file.endsWith('.mjs') ||
                                file.endsWith('.mts') ||
                                file.endsWith('.js') ||
                                file.endsWith('.ts') ||
                                file.endsWith('.tsx') ||
                                file.endsWith('.jsx'))) {
                                potentialElements.push(entryPath);
                            }
                        }
                        catch (error) {
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
                const loadedElements = [];
                for (const elementPath of potentialElements) {
                    try {
                        const elementInfo = await dev_support.loadElementPointers(elementPath, 'auto');
                        loadedElements.push({
                            label: `${elementInfo.name} (${elementInfo.elementType})`,
                            value: elementInfo.name,
                            info: elementInfo,
                            path: elementPath
                        });
                    }
                    catch (error) {
                        // Skip elements that can't be loaded
                    }
                }
                if (loadedElements.length > 0) {
                    setElements(loadedElements);
                    setStatus('ready');
                    return;
                }
                else {
                    setStatus('no-elements');
                }
            }
            catch (error) {
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
    const launchDevServer = async (element, actionSignal, property) => {
        if (!element)
            return;
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
        }
        else if (fs.existsSync(userViteConfigTs)) {
            configToUse = userViteConfigTs;
        }
        // Load the complete element data from compatibility module
        const elementModule = await dev_support.loadElementPointers(element.path, 'auto');
        const currentActionSignal = elementModule.actions?.find(action => action.key === actionSignal.value) ||
            elementModule.signals?.find(signal => signal.key === actionSignal.value);
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
            vite.watcher.on('change', (file) => {
                // console.log(`File changed: ${file}`);
            });
            // Keep the process alive
            setStatus('dev-server-running');
            // Don't exit - keep the server running
            process.stdin.resume();
        }
        catch (error) {
            setStatus('error');
        }
    };
    const handleSelect = async (item) => {
        if (step === 'elements') {
            // First step: select an element
            const element = elements.find(el => el.value === item.value);
            if (!element)
                return;
            setSelectedElement(element);
            setStatus('loading-actions-signals');
            try {
                // Load the element to get its actions and signals
                const elementModule = await dev_support.loadElementPointers(element.path, 'auto');
                const items = [];
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
            }
            catch (error) {
                setStatus('error');
            }
        }
        else if (step === 'actions-signals') {
            // Second step: select an action/signal
            const selectedActionSignal = actionsSignals.find(i => i.value === item.value);
            if (!selectedActionSignal || !selectedElement)
                return;
            setSelectedActionSignal(selectedActionSignal);
            setStatus('loading-properties');
            try {
                // Load the element to get its properties
                const elementModule = await dev_support.loadElementPointers(selectedElement.path, 'auto');
                const currentActionSignal = elementModule.actions?.find(action => action.key === selectedActionSignal.value) ||
                    elementModule.signals?.find(signal => signal.key === selectedActionSignal.value);
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
                    }
                    catch (error) {
                        setStatus('error');
                    }
                    return;
                }
                const propertyItems = [];
                // Add properties that have UI components
                // props is an array, not an object
                currentActionSignal.props.forEach((prop) => {
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
            }
            catch (error) {
                setStatus('error');
            }
        }
        else {
            // Third step: select a property (or launch directly)
            const selectedProperty = properties.find(i => i.value === item.value);
            if (!selectedProperty || !selectedActionSignal || !selectedElement)
                return;
            setSelectedProperty(selectedProperty);
            setSelected(selectedProperty.value);
            setStatus('launching');
            await launchDevServer(selectedElement, selectedActionSignal, selectedProperty);
        }
    };
    if (status === 'loading') {
        return (_jsxs(Box, { flexDirection: "column", marginTop: 2, children: [_jsxs(Text, { children: ["\uD83D\uDD0D Loading elements from: ", _jsx(Text, { color: "cyan", children: rootDir })] }), _jsx(Text, { children: "Loading..." })] }));
    }
    if (status === 'no-elements') {
        return (_jsxs(Box, { flexDirection: "column", marginTop: 2, children: [_jsxs(Text, { color: "red", children: ["\u274C No valid elements found in: ", _jsx(Text, { color: "cyan", children: rootDir })] }), _jsx(Text, { color: "yellow", children: "Make sure the directory contains valid element modules." }), _jsx(Text, { color: "yellow", children: "Supported formats: Pipedream, n8n, Doflo, Process.co" }), _jsx(Text, { color: "yellow", children: "Supported file types: .js, .ts, .mjs, .mts, .jsx, .tsx" })] }));
    }
    if (status === 'error') {
        return (_jsxs(Box, { flexDirection: "column", marginTop: 2, children: [_jsxs(Text, { color: "red", children: ["\u274C Error loading elements from: ", _jsx(Text, { color: "cyan", children: rootDir })] }), _jsx(Text, { color: "yellow", children: "Check that the directory contains valid element modules." })] }));
    }
    if (status === 'loading-actions-signals') {
        return (_jsxs(Box, { flexDirection: "column", marginTop: 2, children: [_jsxs(Text, { children: ["\uD83D\uDD0D Loading actions and signals for '", _jsx(Text, { color: "cyan", children: selectedElement?.info.name }), "'..."] }), _jsx(Text, { children: "Loading..." })] }));
    }
    if (status === 'loading-properties') {
        return (_jsxs(Box, { flexDirection: "column", marginTop: 2, children: [_jsxs(Text, { children: ["\uD83D\uDD0D Loading properties for '", _jsx(Text, { color: "cyan", children: selectedActionSignal?.label }), "'..."] }), _jsx(Text, { children: "Loading..." })] }));
    }
    if (status === 'launching') {
        return (_jsxs(Box, { flexDirection: "column", marginTop: 2, children: [_jsxs(Text, { color: "green", children: ["\uD83D\uDE80 Launching dev server for '", _jsx(Text, { color: "cyan", children: selected }), "'..."] }), _jsxs(Text, { children: ["Directory: ", _jsx(Text, { color: "cyan", children: rootDir })] })] }));
    }
    if (status === 'dev-server-running') {
        return (_jsxs(_Fragment, { children: [_jsxs(Box, { flexDirection: "column", flexShrink: 1, borderStyle: "round", margin: 2, marginBottom: 1, paddingX: 2, paddingY: 1, borderColor: "#8759F2", children: [_jsxs(Text, { children: ["Server Running: ", _jsx(Text, { color: "#01D4E7", underline: true, children: viteUrl })] }), _jsxs(Text, { children: ["Element: ", _jsx(Text, { color: "#01D4E7", children: selectedElement?.info.name })] }), _jsxs(Text, { children: ["Action/Signal: ", _jsx(Text, { color: "#01D4E7", children: selectedActionSignal?.label })] }), selectedProperty ? (_jsxs(Text, { children: ["Property UI: ", _jsx(Text, { color: "#01D4E7", children: selectedProperty.label })] })) : (_jsxs(Text, { children: ["UI Mode: ", _jsx(Text, { color: "#01D4E7", children: "Action/Signal Level" })] })), _jsx(Text, { color: "yellow", children: "Press Ctrl+C to stop the server" })] }), _jsxs(Box, { marginTop: 1, marginLeft: 4, flexDirection: "column", children: [_jsx(Text, { color: "gray", children: "Server Status:" }), viteLogs.length > 0 ? (viteLogs.map((line, i) => (_jsx(Text, { color: "gray", children: line }, i)))) : (_jsx(Text, { color: "gray", children: "Waiting for activity..." }))] })] }));
    }
    if (step === 'properties') {
        return (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Text, { children: ["\uD83D\uDCC1 Element: ", _jsx(Text, { color: "cyan", children: selectedElement?.info.name })] }), _jsxs(Text, { children: ["\uD83D\uDCCB Action/Signal: ", _jsx(Text, { color: "#01D4E7", children: selectedActionSignal?.label })] }), _jsxs(Text, { children: ["Found ", properties.length, " property(ies):"] }), _jsx(SelectInput, { items: properties, onSelect: handleSelect })] }));
    }
    if (step === 'actions-signals') {
        return (_jsxs(Box, { flexDirection: "column", marginTop: 2, marginBottom: 2, children: [_jsxs(Text, { children: ["\uD83D\uDCC1 Element: ", _jsx(Text, { color: "#01D4E7", children: selectedElement?.info.name })] }), _jsxs(Box, { flexDirection: "column", marginTop: 1, children: [_jsxs(Text, { children: ["Found ", actionsSignals.length, " action(s)/signal(s):"] }), _jsx(SelectInput, { items: actionsSignals, onSelect: handleSelect })] })] }));
    }
    return (_jsxs(Box, { flexDirection: "column", marginTop: 2, marginBottom: 2, children: [_jsxs(Box, { flexDirection: "column", children: [_jsxs(Text, { children: ["\uD83D\uDCC1 Directory: ", _jsx(Text, { color: "#01D4E7", children: rootDir })] }), _jsxs(Box, { flexDirection: "column", marginTop: 1, children: [_jsxs(Text, { children: ["Found ", elements.length, " element(s):"] }), _jsx(SelectInput, { items: elements, onSelect: handleSelect })] })] }), _jsx(ViteLogPanel, { logs: viteLogs })] }));
};
// Vite log panel
const ViteLogPanel = ({ logs }) => {
    if (!logs.length)
        return null;
    return (_jsxs(Box, { flexDirection: "column", marginTop: 1, children: [_jsx(Text, { color: "gray", children: "Output:" }), logs.map((line, i) => (_jsx(Text, { color: "gray", children: line }, i)))] }));
};
// Vite banner component
const ViteBanner = ({ url }) => url ? (_jsxs(Box, { marginBottom: 1, justifyContent: "center", borderStyle: "double", borderColor: "#8759F2", marginX: 10, children: [_jsx(Text, { color: "green", children: "\uD83D\uDE80 Process Element Server running at: " }), _jsx(Text, { color: "cyan", underline: true, children: url })] })) : null;
