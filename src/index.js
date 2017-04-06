import 'babel-polyfill';

import program from 'commander';
import Debug  from 'debug';
import pkg from '../package.json';
import {
  init,
  generate,
} from './commands';
import {verifyYeoman} from './utils_create';

const debug = Debug('cg:main');

program
  .version(pkg.version);

let Path = require('path');
let fs = require('fs');

let templateRoot = Path.resolve(__dirname, '../templates')
let templates = fs.readdirSync(templateRoot);
let templateDir = 'es2015';
debug(`Available templates ${JSON.stringify(templates)}`);

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
  .option('-T, --templates <path>', `Select templates from ${templates} (default: ${templateDir})`, templateDir)
  .option('-t, --type', 'Generate a new Type')
  .option('-l, --loader', 'Generate a new Loader')
  .option('-c, --connection', 'Generate a new Connection')
  .option('-m, --mutation', 'Generate a new Mutation')
  .option('--schema <modelPath>', 'Generate from a Mongoose Schema')
  .description('Generate a new file (Type, Loader, Mutation, etc)')
  .action(async (name, options) => {
    await verifyYeoman();

    options.templatePath = Path.resolve(templateRoot, options.templates)
    debug(`Using templates folder ${options.templatePath}`);
    generate(name, options);
  });

program.parse(process.argv);

if (process.argv.length <= 2) {
  program.help();
}
