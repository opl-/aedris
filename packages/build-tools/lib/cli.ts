#!/usr/bin/env node

import 'source-map-support/register';
import yargs, {Argv} from 'yargs';
import commandBuild from './cli/commandBuild';

let args = yargs
	.env('AEDRIS')
	.usage('$0 <command> [options]')
	.help('help').alias('help', 'h')
	.wrap(yargs.terminalWidth())
	.demandCommand();

function apply(cmd: (args: Argv) => Argv): void {
	args = cmd(args);
}

[
	commandBuild,
].forEach(apply);

args.parse();
