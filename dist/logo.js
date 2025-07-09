import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Box, Text } from "ink";
import path from "path";
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.resolve(path.join(__dirname, "../package.json"));
const pack = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
export function lengthAsSpace(version) {
    return new Array(42 - version.length).fill(" ").join("");
}
export default function () {
    // const version = pack.version
    return (_jsx(_Fragment, { children: _jsxs(Box, { flexDirection: "column", display: "flex", alignSelf: "flex-start", marginLeft: 3, marginTop: 1, marginBottom: 1, children: [_jsxs(Box, { flexGrow: 1, children: [_jsx(Text, { color: "whiteBright", bold: true, children: "   _ __  _ __ ___   ___ ___  ___ ___" }), _jsx(Text, { color: "#dffff", children: "   ___ ___  " })] }), _jsxs(Box, { flexGrow: 1, children: [_jsx(Text, { color: "whiteBright", bold: true, children: "  | '_ \\| '__/ _ \\ / __/ _ \\/ __/ __|" }), _jsx(Text, { color: "#dffff", children: " / __/ _ \\" })] }), _jsxs(Box, { flexGrow: 1, children: [_jsx(Text, { color: "whiteBright", bold: true, children: "  | |_) | | | (_) | (_|  __/\\__ \\__ \\" }), _jsx(Text, { color: "#dffff", children: "| (_| (_) | " })] }), _jsxs(Box, { flexGrow: 1, children: [_jsx(Text, { color: "whiteBright", bold: true, children: "  | .__/|_|  \\___/ \\___\\___||___/___" }), _jsx(Text, { color: "#FF3C82", children: "(_)" }), _jsx(Text, { color: "#dffff", children: "___\\___/" })] }), _jsxs(Box, { flexGrow: 1, children: [_jsxs(Text, { color: "whiteBright", bold: true, children: ["  |_|", lengthAsSpace(pack.version)] }), _jsxs(Text, { color: "whiteBright", bold: true, children: ["v", pack.version] })] }), _jsx(Box, { flexGrow: 1, paddingTop: 1, children: _jsx(Text, { color: "whiteBright", bold: true, children: "a CLI to aid in the building of process.co elements" }) })] }) }));
}
