import Generator from 'yeoman-generator';
import {
  getConfigDir,
  getTemplatePath,
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

    this.destinationDir = getConfigDir('connection');
  }

  generateConnection() {
    console.log('hello')
    const name = uppercaseFirstLetter(this.options.name);

    const directories = getRelativeConfigDir('connection', ['type']);

    const templatePath = this.templatePath(getTemplatePath('Connection.js.template'));
    console.log(`template is ${templatePath}`);
    const destinationPath = this.destinationPath(`${this.destinationDir}/${name}Connection.js`);
    const templateVars = {
      name,
      directories,
    };

    console.log(templatePath)

    this.fs.copyTpl(templatePath, destinationPath, templateVars);
  }

  end() {
    this.log('🔥 Connection created!');
  }
}

module.exports = ConnectionGenerator;
