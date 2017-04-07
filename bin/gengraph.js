#!/usr/bin/env node

const program = require('commander');
const debug = require('debug')('gql:main');
const pkg = require('../package.json');
const Generator = require('../src/index');

let Path = require('path');
let fs = require('fs');

let templateRoot = Path.resolve(__dirname, '../templates');
let templates = fs.readdirSync(templateRoot);
let templateDir = 'es2015';
debug(`Available templates ${JSON.stringify(templates)}`);

program
  .version(pkg.version)
  .option('-n, --name <name>', 'Model name')
  .option('-T, --templates <path>', `Select templates from ${templates} (default: ${templateDir})`, templateDir)
  .option('-t, --type', 'Generate a new Type')
  .option('-l, --loader', 'Generate a new Loader')
  .option('-c, --connection', 'Generate a new Connection')
  .option('-m, --mutation', 'Generate a new Mutation')
  .option('--schema', 'Generate from a Mongoose Schema')
  .description('Generate a new file (Type, Loader, Mutation, etc)')
  .parse(process.argv);

let options = {
  name: program.name,
  templates: program.templates,
  type: program.type,
  loader: program.loader,
  connection: program.connection,
  mutation: program.mutation,
  schema: program.schema
}


let generator = new Generator(options);
generator.run()
  .then((resp) => {
    console.log('Done');
  }, (err) => {
    console.log(err);
  });

