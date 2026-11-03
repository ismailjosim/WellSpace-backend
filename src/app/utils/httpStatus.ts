import { createRequire } from 'node:module';

const requireModule = createRequire(__filename);
const HttpStatus = requireModule('http-status').default;

export default HttpStatus;
