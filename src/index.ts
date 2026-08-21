import { loadEnvFile } from 'node:process';
import { startRepl } from './cli/repl.js';

loadEnvFile()
startRepl()