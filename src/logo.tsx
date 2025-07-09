import React from "react";
import {  Box,  Text } from "ink";
import path from "path";
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.resolve(path.join(__dirname, "../package.json"));
const pack = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version: string };


export function lengthAsSpace(version:string){
    return new Array(42 - version.length).fill(" ").join("")
}

export default function (){

    // const version = pack.version
    
return (<>
        <Box flexDirection="column" display="flex" alignSelf="flex-start" marginLeft={3} marginTop={1} marginBottom={1} >
            <Box flexGrow={1} ><Text color="whiteBright" bold={true} >   _ __  _ __ ___   ___ ___  ___ ___</Text><Text color="#dffff">   ___ ___  </Text></Box>
            <Box flexGrow={1}><Text color="whiteBright" bold={true} >  | '_ \| '__/ _ \ / __/ _ \/ __/ __|</Text><Text color="#dffff"> / __/ _ \</Text></Box>
            <Box flexGrow={1}><Text color="whiteBright" bold={true}>  | |_) | | | (_) | (_|  __/\__ \__ \</Text><Text color="#dffff">| (_| (_) | </Text></Box>
            <Box flexGrow={1}><Text color="whiteBright" bold={true}>  | .__/|_|  \___/ \___\___||___/___</Text><Text color="#FF3C82">(_)</Text><Text color="#dffff">___\___/</Text></Box>
            <Box flexGrow={1}><Text color="whiteBright" bold={true}>  |_|{lengthAsSpace(pack.version)}</Text><Text color="whiteBright" bold={true} >v{pack.version}</Text></Box>
            <Box flexGrow={1} paddingTop={1} ><Text color="whiteBright" bold={true} >a CLI to aid in the building of process.co elements</Text></Box>
        </Box>
    </>)
}