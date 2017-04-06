import 'babel-polyfill';

import program from 'commander';

import pkg from '../package.json';
import {
  init,
  generate,
} from './commands';
import { verifyYeoman } from './utils_create';

program
  .version(pkg.version);

import Path from 'path';

let templatePath = Path.resolve(__dirname,'../templates','es2015');

program
  .command('init <project>')
  .alias('i')
  .description('Create a new GraphQL project')
  .action(async (project) => {
    await verifyYeoman();

    init(project);
  });

program
  .command('generate <name>')
  .alias('g')
  .option('-T, --templates <path>', `Path to template files (default: ${templatePath}`, templatePath )
  .option('-t, --type', 'Generate a new Type')
  .option('-l, --loader', 'Generate a new Loader')
  .option('-c, --connection', 'Generate a new Connection')
  .option('-m, --mutation', 'Generate a new Mutation')
  .option('--schema <modelPath>', 'Generate from a Mongoose Schema')
  .description('Generate a new file (Type, Loader, Mutation, etc)')
  .action(async (name, options) => {
    await verifyYeoman();

    generate(name, options);
  });

program.parse(process.argv);

if (process.argv.length <= 2) {
  program.help();
}
