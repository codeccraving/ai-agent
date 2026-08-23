import { loadEnvFile } from 'node:process';
import { AgentREPL } from './cli/repl.js';

loadEnvFile()
new AgentREPL()