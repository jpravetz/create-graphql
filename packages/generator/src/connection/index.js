import Generator from 'yeoman-generator';
import Path from 'path';
import {
  getConfigDir,
  getRelativeConfigDir,
  uppercaseFirstLetter,
} from '../utils';

class ConnectionGenerator extends Generator {
  constructor(args, options) {
    super(args, options);

    this.argument('name', {
      type: String,
      required: true,
    });
    this.argument('template', {
      type: String,
      required: true,
    });

    this.destinationDir = getConfigDir('connection');
  }

  generateConnection() {
    const name = uppercaseFirstLetter(this.options.name);

    const templateDir = Path.resolve(__dirname,'../../templates',this.options.template)
    this.sourceRoot(templateDir);

    const directories = getRelativeConfigDir('connection', ['type']);

    const templatePath = this.templatePath('Connection.js.template');
    console.log('template path is ' + templatePath)
    const destinationPath = this.destinationPath(`${this.destinationDir}/${name}Connection.js`);
    const templateVars = {
      name,
      directories,
    };

    this.fs.copyTpl(templatePath, destinationPath, templateVars);
  }

  end() {
    this.log('🔥 Connection created!');
  }
}

module.exports = ConnectionGenerator;
