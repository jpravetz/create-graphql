import 'babel-polyfill';

import program from 'commander';

import pkg from '../package.json';
import {
  init,
  generate,
} from './commands';
import { verifyYeoman } from './utils';
import Path from 'path';
import fs from 'fs';

const templateDir = Path.resolve(__dirname,'../../generator/templates');
const templates = fs.readdirSync(templateDir);
const template = 'es2015';


program
  .version(pkg.version);

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
  .option('-t, --type', 'Generate a new Type')
  .option('-l, --loader', 'Generate a new Loader')
  .option('-c, --connection', 'Generate a new Connection')
  .option('-m, --mutation', 'Generate a new Mutation')
  .option('--schema <modelPath>', 'Generate from a Mongoose Schema')
  .option('-T --template <name>',`Target node version from ${templates} (default ${template})`, template)
  .description('Generate a new file (Type, Loader, Mutation, etc)')
  .action(async (name, options) => {
    await verifyYeoman();

    generate(name, options);
  });

program.parse(process.argv);

if (process.argv.length <= 2) {
  program.help();
}
