#!/usr/bin/env node
import{b as t}from"./chunk-QPYNK3X7.js";import{a as r}from"./chunk-TP2HSEPI.js";import{render as p}from"ink";import c from"meow";import m from"path";import i from"fs";import{Fragment as f,jsx as o,jsxs as d}from"react/jsx-runtime";process.stdout.write("\x1Bc");var s=c(`
  Usage
    $ process-element [path]

  Options 
    --help     Show help
    --version  Show version

  Examples
    $ process-element                    # Use current directory
    $ process-element /path/to/elements  # Use specified path
    $ process-element ./elements         # Use relative path

  Description
    Scans the specified directory for Process.co element modules (.mjs/.mts files)
    and provides an interactive interface to launch development servers.
`,{importMeta:import.meta}),e=s.input[0]?m.resolve(s.input[0]):process.cwd();i.existsSync(e)||(console.error(`\u274C Error: Path '${e}' does not exist.`),process.exit(1));var a=i.statSync(e);a.isDirectory()||(console.error(`\u274C Error: '${e}' is not a directory.`),process.exit(1));var l=({rootDir:n})=>d(f,{children:[o(t,{}),o(r,{rootDir:n})]});p(o(l,{rootDir:e}));
