import {Service, PlatformAccessory} from 'homebridge';
import {DeviceClient, DeviceStatus} from './device.js';
import {HomebridgeMHIWFRACPlatform} from './platform.js';


export class WFRACAccessory {
  private readonly deviceName: string;
  private readonly ipAddress: string;
  private readonly port = 51443;
  private readonly operatorId : string;

  private device: DeviceClient;

  private thermostatService: Service;
  private fanService: Service;
  private dehumidifierService: Service;
  private refreshTimeout: NodeJS.Timeout | null = null;

  constructor(
    private readonly platform: HomebridgeMHIWFRACPlatform,
    private readonly accessory: PlatformAccessory,
    ip: string,
  ) {
    this.deviceName = accessory.context.device.name;
    this.ipAddress = ip;
    this.operatorId = this.platform.api.hap.uuid.generate('HomebridgeMHIWFRAC').toString().toUpperCase();
    this.device = new DeviceClient(this.ipAddress, this.port, this.operatorId, this.deviceName, this.platform.log);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Mitsubishi Heavy Industries.')
      .setCharacteristic(this.platform.Characteristic.Model, 'WF-RAC Smart M-Air Series')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceName);

    this.thermostatService = this.accessory.getService(this.platform.Service.Thermostat) || this.accessory.addService(this.platform.Service.Thermostat);
    this.fanService = this.accessory.getService(this.platform.Service.Fanv2) || this.accessory.addService(this.platform.Service.Fanv2);
    this.dehumidifierService = this.accessory.getService(this.platform.Service.HumidifierDehumidifier) || this.accessory.addService(this.platform.Service.HumidifierDehumidifier);

    this.thermostatService.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
      .onGet(() => this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS);
    this.thermostatService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .setProps({minValue: DeviceStatus.indoorTempList.at(0), maxValue: DeviceStatus.indoorTempList.at(-1), minStep: 0.1});
    this.thermostatService.getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .setProps({minValue: 18, maxValue: 30, minStep: 0.5});

    this.dehumidifierService.getCharacteristic(this.platform.Characteristic.TargetHumidifierDehumidifierState)
      .setProps({validValues: [this.platform.Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER]});
    this.dehumidifierService.getCharacteristic(this.platform.Characteristic.CurrentHumidifierDehumidifierState)
      .setProps({validValues: [this.platform.Characteristic.CurrentHumidifierDehumidifierState.INACTIVE, this.platform.Characteristic.CurrentHumidifierDehumidifierState.DEHUMIDIFYING]});

    // We should implement current relative humidity to be compliant with the specs, but we do not know any value.

    this.refreshStatus();

  }


  refreshStatus() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    this.device.getDeviceStatus().then( () => {
      this.updateStatus();
    }).catch((error) => {
      this.platform.log.error(`Error getting status for ${this.deviceName}: ${error}`);
    });
    this.refreshTimeout = setTimeout(() => this.refreshStatus(), 10000);
  }

  updateStatus() {
    this.platform.log(`Status for ${this.deviceName}: ${JSON.stringify(this.device.status)}`);

    if (this.device.status.indoorTemp) {
      this.thermostatService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.device.status.indoorTemp);
    }
    if (this.device.status.presetTemp && this.device.status.operationMode !== 3) {
      this.thermostatService.updateCharacteristic(this.platform.Characteristic.TargetTemperature, this.device.status.presetTemp);
    }

    let currentHeatingCoolingState = this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
    let targetHeatingCoolingState = this.platform.Characteristic.TargetHeatingCoolingState.OFF;

    let currentFanActive = this.platform.Characteristic.Active.INACTIVE;
    let currentFanState = this.platform.Characteristic.CurrentFanState.INACTIVE;
    let targetFanState = this.platform.Characteristic.TargetFanState.AUTO;

    let currentDehumidifierActive = this.platform.Characteristic.Active.INACTIVE;
    let currentHumidifierDehumidifierState = this.platform.Characteristic.CurrentHumidifierDehumidifierState.INACTIVE;
    let targetHumidifierDehumidifierState = this.platform.Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER;

    if (this.device.status.operation) {
      if (this.device.status.operationMode === 0 || this.device.status.operationMode === -1) {
        this.platform.log.info('Auto');

        targetHeatingCoolingState = this.platform.Characteristic.TargetHeatingCoolingState.AUTO;

        if (this.device.status.coolHotJudge) {
          currentHeatingCoolingState = this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;

          currentFanActive = this.platform.Characteristic.Active.INACTIVE;
          currentFanState = this.platform.Characteristic.CurrentFanState.IDLE;
        } else {
          currentHeatingCoolingState = this.platform.Characteristic.CurrentHeatingCoolingState.COOL;

          currentFanActive = this.platform.Characteristic.Active.ACTIVE;
          currentFanState = this.platform.Characteristic.CurrentFanState.BLOWING_AIR;
        }
      } else if (this.device.status.operationMode === 1) {
        this.platform.log.info('Cooling');

        targetHeatingCoolingState = this.platform.Characteristic.TargetHeatingCoolingState.COOL;
        currentHeatingCoolingState = this.platform.Characteristic.CurrentHeatingCoolingState.COOL;

        currentFanActive = this.platform.Characteristic.Active.ACTIVE;
        currentFanState = this.platform.Characteristic.CurrentFanState.BLOWING_AIR;

      } else if (this.device.status.operationMode === 2) {
        this.platform.log.info('Heating');

        targetHeatingCoolingState = this.platform.Characteristic.TargetHeatingCoolingState.HEAT;
        currentHeatingCoolingState = this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;

        currentFanActive = this.platform.Characteristic.Active.INACTIVE;
        currentFanState = this.platform.Characteristic.CurrentFanState.INACTIVE;
      } else if (this.device.status.operationMode === 3) {
        this.platform.log.info('Fan');

        currentFanActive = this.platform.Characteristic.Active.ACTIVE;
        currentFanState = this.platform.Characteristic.CurrentFanState.BLOWING_AIR;

        currentHeatingCoolingState = this.platform.Characteristic.CurrentHeatingCoolingState.COOL;
        targetHeatingCoolingState = this.platform.Characteristic.TargetHeatingCoolingState.AUTO;
      } else if (this.device.status.operationMode === 4) {
        this.platform.log.info('Drying');

        currentDehumidifierActive = this.platform.Characteristic.Active.ACTIVE;
        currentHumidifierDehumidifierState = this.platform.Characteristic.CurrentHumidifierDehumidifierState.DEHUMIDIFYING;
        targetHumidifierDehumidifierState = this.platform.Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER;

        if (this.device.status.presetTemp! < this.device.status.indoorTemp!) {
          currentHeatingCoolingState = this.platform.Characteristic.CurrentHeatingCoolingState.COOL;

          currentFanActive = this.platform.Characteristic.Active.ACTIVE;
          currentFanState = this.platform.Characteristic.CurrentFanState.BLOWING_AIR;
        } else {
          currentHeatingCoolingState = this.platform.Characteristic.CurrentHeatingCoolingState.OFF;

          currentFanActive = this.platform.Characteristic.Active.INACTIVE;
          currentFanState = this.platform.Characteristic.CurrentFanState.IDLE;
        }

        targetFanState = this.platform.Characteristic.TargetFanState.AUTO;

        targetHeatingCoolingState = this.platform.Characteristic.TargetHeatingCoolingState.AUTO;
      }
    }

    this.thermostatService.updateCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState, currentHeatingCoolingState);
    this.thermostatService.updateCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState, targetHeatingCoolingState);

    this.fanService.updateCharacteristic(this.platform.Characteristic.Active, currentFanActive);
    this.fanService.updateCharacteristic(this.platform.Characteristic.CurrentFanState, currentFanState);

    const fanSpeed = this.device.status.airFlow * 25;
    if (fanSpeed === 0 || this.device.status.operationMode === 4) {
      targetFanState = this.platform.Characteristic.TargetFanState.AUTO;
    } else {
      targetFanState = this.platform.Characteristic.TargetFanState.MANUAL;
    }

    this.fanService.updateCharacteristic(this.platform.Characteristic.RotationSpeed, fanSpeed);
    this.fanService.updateCharacteristic(this.platform.Characteristic.TargetFanState, targetFanState);

    this.dehumidifierService.updateCharacteristic(this.platform.Characteristic.Active, currentDehumidifierActive);
    this.dehumidifierService.updateCharacteristic(this.platform.Characteristic.CurrentHumidifierDehumidifierState, currentHumidifierDehumidifierState);
    this.dehumidifierService.updateCharacteristic(this.platform.Characteristic.TargetHumidifierDehumidifierState, targetHumidifierDehumidifierState);
  }
}

