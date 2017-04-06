// @flow

import { connectionDefinitions } from 'graphql-relay';

import TestType from '../types/TestType';

export default connectionDefinitions({
  name: 'Test',
  nodeType: TestType,
});
