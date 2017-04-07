const Path = require('path');
const PUtils = require('./utils');
const debug = require('debug')('cg:generator');
const cmds = {}

const availableOptions = ['type', 'loader', 'connection', 'mutation'];

// availableOptions.forEach(opt => {
//   cmds[opt] = require('./' + opt);
// });

class Generator {

  constructor (options = {}) {
    this._options = this._parseOptions(options);
  }

  _parseOptions (opts) {
    // Check if any commands were provided
    let anyCommandsProvided = false;
    availableOptions.forEach((cmd) => {
      if (opts[cmd]) {
        anyCommandsProvided = true;
      }
    });
    let options = opts;
    // If not, use the default options
    if (!anyCommandsProvided) {
      availableOptions.forEach((cmd) => {
        options[cmd] = true;
      });
    }
    return options;
  }

  run () {
    debug( 'Options = %s', JSON.stringify(this._options));
    let putils = new PUtils();
    return putils.getConfig()
      .then(() => {
        return putils.getMongoseSchema({
          model: this._options.name,
          withTimestamps: true,
          ref: true,
        });
      })
      .then((schema) => {
        let jobs = [];
        availableOptions.forEach((cmd) => {
          if (this._options[cmd]) {
            const opts = {
              model: options.name,
              schema: schema
            };
            let job = cmds[cmd](opts);
            jobs.push(job);
          }
        });
        return Promise.all(jobs);
      })
  }

}


module.exports = Generator;
