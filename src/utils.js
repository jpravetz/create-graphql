const Path = require('path');
const process = require('process');
const fsp = require('fs-promise');
const recast = require('recast');
const babylon = require('babylon');
const findNearestFile = require('find-nearest-file');
const visit = recast.types;
// const { visit } = recast.types;


class Utils {

  constructor () {
    this._directories = {};
    this._files = {};
  }

  getConfig () {
    this._rootPath = process.cwd();
    const defaultConfigPath = path.resolve(__dirname, 'graphqlrc.json');
    return fsp.readFile(defaultConfigPath)
      .then((resp) => {
        let config = JSON.parse(resp);
        this._directories = config.directories;
        this._files = config.files;
        const customConfig = findNearestFile('.graphqlrc');
        if (customConfig) {
          this._rootPath = Path.dirname(customConfig);
        } else {
          this._rootPath = findNearestFile('package.json');
        }
        Object.assign(this._directories, customConfig ? customConfig.directories : null);
        Object.assign(this._files, customConfig ? customConfig.files : null);
        // this._sourceDir = Path.resolve(this._rootPath,this._directories.source);
      });
  }

  getDirectory (name) {
    return Path.resolve(this._rootPath, this._directories[name]);
  }

  findModelPath (model) {
    const modelDir = this.getDirectory('model');
    let modelPath = Path.resolve(modelDir, model + '.js');
    return fsp.stat(modelPath)
      .then((stats) => {
        if (stats.isFile()) {
          return modelPath;
        } else {
          modelPath = Path.resolve(modelDir, model, 'index.js');
          return fsp.stat(modelPath)
            .then((stats) => {
              if (stats.isFile()) {
                return modelPath;
              } else {
                throw new Error(`Model '${model}' definition file not found`);
              }
            });
        }
      })
  }


  getMongoseSchema (options = {}) {
    if (options && options.model) {
      return this.findModelPath(options.model)
        .then((modelPath) => {
          return getModelCode(modelPath);
        })
        .then((resp) => {
          return getSchemaDefinition(modelCode, options.withTimestamps, options.ref);
        })
    }
  }

  /**
   * Get the Mongoose model schema code
   * @param modelPath {string} The path of the Mongoose model
   * @returns {string} The code of the Mongoose model
   */
  getModelCode (modelPath) {
    return fsp.readFile(modelPath, 'utf8');
  }

  static getSchemaDefinition (modelCode, withTimestamps, ref) {
    const ast = recast.parse(modelCode, {
      parser: {
        parse: (source) => {
          const parseOpts = { // eslint-disable-line global-require
            sourceType: 'module',
            plugins: [
              'asyncFunctions',
              'asyncGenerators',
              'classConstructorCall',
              'classProperties',
              'flow',
              'objectRestSpread',
              'trailingFunctionCommas',
            ],
          };
          babylon.parse(source, parseOpts)
        }
      },
    });

    let fields = null;

    const visitOpts = {
      visitExpression: function visitExpression (expressionPath) { // eslint-disable-line object-shorthand
        const { node } = expressionPath;

        if (
          node.type === 'NewExpression' &&
          node.callee.object.name === 'mongoose' &&
          node.callee.property.name === 'Schema'
        ) {
          fields = getSchemaFieldsFromAst(node, withTimestamps);

          this.abort();
        }

        return this.traverse(expressionPath);
      },
    };
    visit(ast, visitOpts);

    return Utils.parseGraphQLSchema(fields, ref);
  }

  static  parseGraphQLSchema (mongooseFields, ref) {
    const dependencies = [];
    const typeDependencies = [];
    const loaderDependencies = [];

    const fields = Object.keys(mongooseFields).map((name) => {
      const field = Utils.parseFieldToGraphQL(mongooseFields[name], ref);

      if (field.graphqlType) {
        if (typeDependencies.indexOf(field.graphqlType) === -1) {
          typeDependencies.push(field.graphqlType);
        }

        if (loaderDependencies.indexOf(field.graphqlLoader) === -1) {
          loaderDependencies.push(field.graphqlLoader);
        }
      } else if (dependencies.indexOf(field.type) === -1) {
        dependencies.push(field.type);
      }

      return field;
    });

    return {
      fields,
      dependencies,
      typeDependencies,
      loaderDependencies,
    };
  }

  static parseFieldToGraphQL (field, ref) {
    const graphQLField = {
      name: field.name,
      description: field.description,
      required: !!field.required,
      originalType: field.type,
      resolve: `obj.${field.name}`,
    };

    const name = Utils.uppercaseFirstLetter(field.name);
    const typeFileName = `${name}Type`;
    const loaderFileName = `${name}Loader`;

    switch (field.type) {
      case 'Number':
        return {
          ...graphQLField,
          type: 'GraphQLInt',
          flowType: 'number',
        };
      case 'Boolean':
        return {
          ...graphQLField,
          type: 'GraphQLBoolean',
          flowType: 'boolean',
        };
      case 'ObjectId':
        if (ref) {
          return {
            ...graphQLField,
            type: typeFileName,
            flowType: 'string',
            resolve: `await ${loaderFileName}.load(user, obj.${field.name})`,
            resolveArgs: 'async (obj, args, { user })',
            graphqlType: typeFileName,
            graphqlLoader: loaderFileName,
          };
        }

        return {
          ...graphQLField,
          type: 'GraphQLID',
          flowType: 'string',
        };
      case 'Date':
        return {
          ...graphQLField,
          type: 'GraphQLString',
          flowType: 'string',
          resolve: `obj.${field.name}.toISOString()`,
        };
      default:
        return {
          ...graphQLField,
          type: 'GraphQLString',
          flowType: 'string',
        };
    }
  }

  static getSchemaFieldsFromAst (node, withTimestamps) {
    const astSchemaFields = node.arguments[0].properties;

    const fields = [];
    astSchemaFields.forEach((field) => {
      const name = field.key.name;

      const fieldDefinition = {};

      if (field.value.type === 'ArrayExpression') {
        return;
      }

      field.value.properties.forEach(({ key, value }) => {
        fieldDefinition[key.name] = value.name || value.value;
      });

      fields[name] = {
        name,
        ...fieldDefinition,
      };
    });

    if (withTimestamps) {
      const astSchemaTimestamp = Utils.getSchemaTimestampsFromAst(node.arguments[1].properties);

      return {
        ...fields,
        ...astSchemaTimestamp,
      };
    }

    return fields;
  }


  /**
   * Parse the _options_ argument of a Mongoose model and check if it has a `timestamps` entry,
   * parse its content if it does
   * @param nodes {Array} The _options_ argument of `new mongoose.Schema()`
   * @returns {Array} The parsed value of timestamps with the provided field name
   */
  static getSchemaTimestampsFromAst (nodes) {
    const timestampFields = [];

    nodes.forEach((node) => {
      if (node.key.name === 'timestamps') {
        node.value.properties.forEach((timestampProperty) => {
          const fieldName = timestampProperty.value.value;

          timestampFields[fieldName] = {
            name: fieldName,
            type: 'Date',
          };
        });
      }
    });

    return timestampFields;
  }

  /**
   * Camel cases text
   * @param text {string} Text to be camel-cased
   * @returns {string} Camel-cased text
   */
  static camelCaseText (text) {
    text.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
      if (+match === 0) {
        return '';
      }
      return index === 0 ? match.toLowerCase() : match.toUpperCase();
    });
  }

  /**
   * Uppercase the first letter of a text
   * @param text {string}
   * @returns {string}
   */
  static uppercaseFirstLetter (text) {
    return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
  }

  /**
   * Get the relative path directory between two directories specified on the config file
   * @param from {string} The calling directory of the script
   * @param to {[string]} The destination directories
   * @returns {string} The relative path, e.g. '../../src'
   */
  getRelativeConfigDir (from, to) {

    // return to.reduce((this._directories, dir)  =>     {
    //   const relativePath = path.posix.relative(config[from], config[dir]);
    //   return {
    //     ...directories,
    //     [dir]: relativePath === '' ? '.' : relativePath,
    //   };

  }

}

module.exports = Utils;