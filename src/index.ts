import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings.js';
import {HomebridgeMHIWFRACPlatform} from './platform.js';

export default (api: API) => {
  api.registerPlatform(PLATFORM_NAME, HomebridgeMHIWFRACPlatform);
};
