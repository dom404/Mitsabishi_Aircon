import { API, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import bonjour from 'bonjour';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { WFRACAccessory } from './platformAccessory.js';

export class HomebridgeMHIWFRACPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.info('Finished initializing platform:', 'Homebridge MHI WFRAC');

    if (!log.success) {
      log.success = log.info;
    }

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  discoverDevices() {
    const bonjourService = bonjour();

    // Start looking for devices advertising _beaver._tcp service
    bonjourService.find({type: 'beaver', protocol: 'tcp'},
      (service) => {
        service.addresses.forEach((address) => {
          this.log.info('Discovered device:', service.name, address);
          // Generate a UUID for the accessory
          const uuid = this.api.hap.uuid.generate(service.name);

          // Check if this accessory has already been registered
          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

          if (existingAccessory) {
            // Accessory exists, restore from cache
            this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
            new WFRACAccessory(this, existingAccessory, address);
          } else {
            // Accessory does not exist, create a new one
            this.log.info('Adding new accessory:', service.name);
            const accessory = new this.api.platformAccessory(service.name, uuid);

            // Store device details in accessory.context
            accessory.context.device = {
              name: service.name,
              uniqueId: uuid,
            };

            // Create the accessory handler
            new WFRACAccessory(this, accessory, address);

            // Register the accessory with Homebridge
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          }
        });
      });
  }
}
