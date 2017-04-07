'use strict';

const Schema = require('mongoose').Schema;

const def = {
  urn: {
    type: String,
    required: true,
    description: 'Machine-readible name of the truck type'
  },
  cn: {
    en: {
      type: String,
      required: true,
      description: 'The full common English name of the truck type'
    }
  }
};

module.exports = function (server) {

  let schema = new Schema(def, { collection: 'TruckType', timestamps: true });

  // schema.plugin(require('./methods'),{server:server});
  // schema.plugin(require('./hooks'),{server:server});
  // schema.plugin(require('./validations'),{server:server});

  server.connection.model('TruckType', schema);

  return schema;
};
