import {Service, PlatformAccessory, CharacteristicValue} from 'homebridge';
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
    this.operatorId = 'E0F96719-367D-4D03-8A2C-D8F935486AFD'; // this.platform.api.hap.uuid.generate('HomebridgeMHIWFRAC').toString().toUpperCase()";
    // TODO: we should create a new operatorId for the platform and register it to the device.
    this.device = new DeviceClient(this.ipAddress, this.port, this.operatorId, this.deviceName, this.platform.log);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Mitsubishi Heavy Industries.')
      .setCharacteristic(this.platform.Characteristic.Model, 'WF-RAC Smart M-Air Series')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceName);

    this.thermostatService = this.accessory.getService(this.platform.Service.Thermostat) || this.accessory.addService(this.platform.Service.Thermostat);
    this.fanService = this.accessory.getService(this.platform.Service.Fanv2) || this.accessory.addService(this.platform.Service.Fanv2); // TODO maybe this should be AirPurifier so we have an extra button for the fan (to switch to manual mode)
    this.dehumidifierService = this.accessory.getService(this.platform.Service.HumidifierDehumidifier) || this.accessory.addService(this.platform.Service.HumidifierDehumidifier);

    this.thermostatService.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
      .onGet(() => this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS);
    this.thermostatService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .setProps({minValue: DeviceStatus.indoorTempList.at(0), maxValue: DeviceStatus.indoorTempList.at(-1), minStep: 0.1});
    this.thermostatService.getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .setProps({minValue: 18, maxValue: 30, minStep: 0.5});

    this.fanService.getCharacteristic(this.platform.Characteristic.RotationSpeed).setProps({minValue: 0, maxValue: 100, minStep: 25});

    this.dehumidifierService.getCharacteristic(this.platform.Characteristic.TargetHumidifierDehumidifierState)
      .setProps({validValues: [this.platform.Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER]});
    this.dehumidifierService.getCharacteristic(this.platform.Characteristic.CurrentHumidifierDehumidifierState)
      .setProps({validValues: [this.platform.Characteristic.CurrentHumidifierDehumidifierState.INACTIVE, this.platform.Characteristic.CurrentHumidifierDehumidifierState.DEHUMIDIFYING]});

    // We should implement current relative humidity to be compliant with the specs, but we do not know any value.

    this.thermostatService.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .onSet(this.setTargetHeatingCoolingState.bind(this));
    this.thermostatService.getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .onSet(this.setTargetTemperature.bind(this));
    this.fanService.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(this.setFanActive.bind(this));
    this.fanService.getCharacteristic(this.platform.Characteristic.TargetFanState)
      .onSet(this.setTargetFanState.bind(this));
    this.fanService.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onSet(this.setRotationSpeed.bind(this));
    this.dehumidifierService.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(this.setHumidifierActive.bind(this));

    // TODO we do not implement the target humidifier state, since we only accept DEHUMIDIFIER as a valid value.

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
    let fanSpeed = 0;
    let targetFanState = this.platform.Characteristic.TargetFanState.AUTO;

    let currentDehumidifierActive = this.platform.Characteristic.Active.INACTIVE;
    let currentHumidifierDehumidifierState = this.platform.Characteristic.CurrentHumidifierDehumidifierState.INACTIVE;
    let targetHumidifierDehumidifierState = this.platform.Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER;

    if (this.device.status.operation) {
      currentFanActive = this.platform.Characteristic.Active.ACTIVE;
      fanSpeed = this.device.status.airFlow * 25;
      currentFanState = (this.device.status.airFlow === 0) ? this.platform.Characteristic.CurrentFanState.IDLE : this.platform.Characteristic.CurrentFanState.BLOWING_AIR;
      targetFanState = (this.device.status.airFlow === 0) ? this.platform.Characteristic.TargetFanState.AUTO : this.platform.Characteristic.TargetFanState.MANUAL;
      if (this.device.status.operationMode === 0 || this.device.status.operationMode === -1) {
        targetHeatingCoolingState = this.platform.Characteristic.TargetHeatingCoolingState.AUTO;
        if (this.device.status.coolHotJudge) {
          currentHeatingCoolingState = this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
        } else {
          currentHeatingCoolingState = this.platform.Characteristic.CurrentHeatingCoolingState.COOL;
        }
      } else if (this.device.status.operationMode === 1) {
        targetHeatingCoolingState = this.platform.Characteristic.TargetHeatingCoolingState.COOL;
        currentHeatingCoolingState = this.platform.Characteristic.CurrentHeatingCoolingState.COOL;
      } else if (this.device.status.operationMode === 2) {
        targetHeatingCoolingState = this.platform.Characteristic.TargetHeatingCoolingState.HEAT;
        currentHeatingCoolingState = this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
      } else if (this.device.status.operationMode === 3) {
        currentHeatingCoolingState = this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
        targetHeatingCoolingState = this.platform.Characteristic.TargetHeatingCoolingState.OFF;
      } else if (this.device.status.operationMode === 4) {
        currentDehumidifierActive = this.platform.Characteristic.Active.ACTIVE;
        currentHumidifierDehumidifierState = this.platform.Characteristic.CurrentHumidifierDehumidifierState.DEHUMIDIFYING;
        targetHumidifierDehumidifierState = this.platform.Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER;

        if (this.device.status.presetTemp! < this.device.status.indoorTemp!) {
          currentHeatingCoolingState = this.platform.Characteristic.CurrentHeatingCoolingState.COOL;
        } else {
          currentHeatingCoolingState = this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
        }
        targetHeatingCoolingState = this.platform.Characteristic.TargetHeatingCoolingState.AUTO;

        currentFanActive = this.platform.Characteristic.Active.INACTIVE;
        currentFanState = this.platform.Characteristic.CurrentFanState.BLOWING_AIR;
        fanSpeed = 0;
        targetFanState = this.platform.Characteristic.TargetFanState.AUTO;
      }
    }

    this.thermostatService.updateCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState, currentHeatingCoolingState);
    this.thermostatService.updateCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState, targetHeatingCoolingState);

    this.fanService.updateCharacteristic(this.platform.Characteristic.Active, currentFanActive);
    this.fanService.updateCharacteristic(this.platform.Characteristic.CurrentFanState, currentFanState);
    this.fanService.updateCharacteristic(this.platform.Characteristic.RotationSpeed, fanSpeed);
    this.fanService.updateCharacteristic(this.platform.Characteristic.TargetFanState, targetFanState);

    this.dehumidifierService.updateCharacteristic(this.platform.Characteristic.Active, currentDehumidifierActive);
    this.dehumidifierService.updateCharacteristic(this.platform.Characteristic.CurrentHumidifierDehumidifierState, currentHumidifierDehumidifierState);
    this.dehumidifierService.updateCharacteristic(this.platform.Characteristic.TargetHumidifierDehumidifierState, targetHumidifierDehumidifierState);
  }

  setTargetHeatingCoolingState(value: CharacteristicValue) {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    switch (value) {
      case this.platform.Characteristic.TargetHeatingCoolingState.OFF:
        this.platform.log.info('Setting OFF');
        this.device.setOperation(false);
        break;
      case this.platform.Characteristic.TargetHeatingCoolingState.HEAT:
        this.platform.log.info('Setting HEAT');
        if (!this.device.status.operation) {
          this.device.setOperation(true);
        }
        this.device.setOperationMode(2);
        break;
      case this.platform.Characteristic.TargetHeatingCoolingState.COOL:
        this.platform.log.info('Setting COOL');
        if (!this.device.status.operation) {
          this.device.setOperation(true);
        }
        this.device.setOperationMode(1);
        break;
      case this.platform.Characteristic.TargetHeatingCoolingState.AUTO:
        this.platform.log.info('Setting AUTO');
        if (!this.device.status.operation) {
          this.device.setOperation(true);
        }
        this.device.setOperationMode(0);
        this.device.setAirflow(0);
        break;
    }
  }

  setTargetTemperature(value: CharacteristicValue) {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    this.platform.log.info('Setting target temperature to', value);
    this.device.setPresetTemp(value as number);
  }

  setFanActive(value: CharacteristicValue) {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    switch (value) {
      case this.platform.Characteristic.Active.INACTIVE:
        this.platform.log.info('Setting fan inactive');
        if (this.device.status.operationMode === 3) {
          this.device.setOperation(false);
        } else {
          this.device.setAirflow(0);
        }
        break;
      case this.platform.Characteristic.Active.ACTIVE:
        this.platform.log.info('Setting fan active');
        if (!this.device.status.operation) {
          this.device.setOperation(true);
          this.device.setOperationMode(3);
        } else {
          this.device.setAirflow(0);
        }
        break;
    }
  }

  setTargetFanState(value: CharacteristicValue) {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    switch (value) {
      case this.platform.Characteristic.TargetFanState.AUTO:
        this.platform.log.info('Setting AUTO');
        this.device.setAirflow(0);
        break;
      case this.platform.Characteristic.TargetFanState.MANUAL:
        this.platform.log.info('Setting MANUAL');
        // TODO
        break;
    }
  }

  setRotationSpeed(value: CharacteristicValue) {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    this.platform.log.info('Setting fan speed to', value);
    this.device.setAirflow(Math.round(value as number / 25));
  }

  setHumidifierActive(value: CharacteristicValue) {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    this.platform.log.info('Setting dehumidifier active to', value);
    if (!this.device.status.operation) {
      this.device.setOperation(true);
    }
    this.device.setOperationMode(4);
  }
}

