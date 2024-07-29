import {Service, PlatformAccessory, CharacteristicValue} from 'homebridge';
import {DeviceClient, DeviceStatus} from './device.js';
import {HomebridgeMHIWFRACPlatform} from './platform.js';


export class WFRACAccessory {
  private readonly deviceName: string;
  private readonly ipAddress: string;
  private port = 51443;
  private operatorId = '12345';

  private device: DeviceClient;

  private thermostatService: Service;
  // private fanService: Service;
  // private dehumidifierService: Service;

  constructor(
    private readonly platform: HomebridgeMHIWFRACPlatform,
    private readonly accessory: PlatformAccessory,
    ip: string,
  ) {
    this.deviceName = accessory.context.device.name;
    this.ipAddress = ip;
    this.device = new DeviceClient(this.ipAddress, this.port, this.operatorId, this.deviceName, this.platform.log);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Mitsubishi Heavy Industries.')
      .setCharacteristic(this.platform.Characteristic.Model, 'WF-RAC Smart M-Air Series')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceName);

    setInterval(() => {
      this.device.getDeviceStatus().then((status) => {
        this.platform.log.info(`Status: ${JSON.stringify(status)}`);
      });
    }, 10000);

    this.thermostatService = this.accessory.getService(this.platform.Service.Thermostat) || this.accessory.addService(this.platform.Service.Thermostat);
    // this.fanService = this.accessory.getService(this.platform.Service.Fanv2) || this.accessory.addService(this.platform.Service.Fanv2);
    // this.dehumidifierService = this.accessory.getService(this.platform.Service.HumidifierDehumidifier) || this.accessory.addService(this.platform.Service.HumidifierDehumidifier);

    // this.thermostatService.getCharacteristic(this.platform.Characteristic.Active)
    //   .onGet(this.getActive.bind(this))
    //   .onSet(this.setActive.bind(this));

    this.thermostatService.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
      .onGet(this.getCurrentHeatingCoolingState.bind(this));
    this.thermostatService.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .onGet(this.getTargetHeatingCoolingState.bind(this))
      .onSet(this.setTargetHeatingCoolingState.bind(this));

    this.thermostatService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getCurrentTemperature.bind(this));
    this.thermostatService.getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .onGet(this.getTargetTemperature.bind(this))
      .onSet(this.setTargetTemperature.bind(this));

    this.thermostatService.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
      .onGet(() => this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS);



    // this.dehumidifierService.getCharacteristic(this.platform.Characteristic.Active)
    //   .onGet(this.getDehumidifierActive.bind(this))
    //   .onSet(this.setDehumidifierActive.bind(this));
    //
    // this.dehumidifierService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
    //   .onGet(() => 50);
    // this.dehumidifierService.getCharacteristic(this.platform.Characteristic.CurrentHumidifierDehumidifierState)
    //   .onGet(this.getCurrentHumidifierDehumidifierState.bind(this));
    // this.dehumidifierService.getCharacteristic(this.platform.Characteristic.TargetHumidifierDehumidifierState)
    //   .onGet(this.getTargetHumidifierDehumidifierState.bind(this))
    //   .onSet(this.setTargetHumidifierDehumidifierState.bind(this));


  }

  // getActive(): CharacteristicValue {
  //   // this.checkValid();
  //   return this.device.status.operation ? this.platform.Characteristic.Active.ACTIVE : this.platform.Characteristic.Active.INACTIVE;
  // }
  //
  // setActive(value: CharacteristicValue) {
  //   // this.checkValid();
  //   this.platform.log.info(`Setting power to ${value}`);
  //   const newStatus = this.device.status;
  //   newStatus.operation = value === this.platform.Characteristic.Active.ACTIVE;
  //   this.device.setDeviceStatus(newStatus);
  // }

  getCurrentTemperature(): CharacteristicValue {
    // this.checkValid();
    return this.device.status.indoorTemp;
  }

  getTargetTemperature(): CharacteristicValue {
    // this.checkValid();
    return this.device.status.presetTemp;
  }

  setTargetTemperature(value: CharacteristicValue) {
    // this.checkValid();
    this.platform.log.info(`Setting target temperature to ${value}`);
    const newStatus = this.device.status;
    newStatus.presetTemp = value as number;
    this.device.setDeviceStatus(newStatus);
  }

  getCurrentHeatingCoolingState(): CharacteristicValue {
    // this.checkValid();
    this.platform.log.info(`Current status: ${this.device.status}`);
    this.platform.log.info(`Current mode: ${this.device.status.operationMode}`);

    switch (this.device.status.operationMode) {
      case DeviceStatus.OPERATION_MODES.auto:
        return this.platform.Characteristic.CurrentHeatingCoolingState.OFF; // TODO
      case DeviceStatus.OPERATION_MODES.cool:
        return this.platform.Characteristic.CurrentHeatingCoolingState.COOL;
      case DeviceStatus.OPERATION_MODES.heat:
        return this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
      case DeviceStatus.OPERATION_MODES.fan:
        return this.platform.Characteristic.CurrentHeatingCoolingState.OFF; // TODO
      case DeviceStatus.OPERATION_MODES.dry:
        return this.platform.Characteristic.CurrentHeatingCoolingState.OFF; // TODO
      default:
        return this.platform.Characteristic.CurrentHeatingCoolingState.OFF; // TODO
    }
  }

  getTargetHeatingCoolingState(): CharacteristicValue {
    // this.checkValid();
    if (this.device.status === undefined || this.device.status.operationMode === undefined) {
      return this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
    }

    switch (this.device.status.operationMode) {
      case DeviceStatus.OPERATION_MODES.auto:
        return this.platform.Characteristic.TargetHeatingCoolingState.AUTO;
      case DeviceStatus.OPERATION_MODES.cool:
        return this.platform.Characteristic.TargetHeatingCoolingState.COOL;
      case DeviceStatus.OPERATION_MODES.heat:
        return this.platform.Characteristic.TargetHeatingCoolingState.HEAT;
      case DeviceStatus.OPERATION_MODES.fan:
        return this.platform.Characteristic.TargetHeatingCoolingState.OFF; // TODO
      case DeviceStatus.OPERATION_MODES.dry:
        return this.platform.Characteristic.TargetHeatingCoolingState.OFF; // TODO
      default:
        return this.platform.Characteristic.TargetHeatingCoolingState.OFF; // TODO
    }
  }

  setTargetHeatingCoolingState(value: CharacteristicValue) {
    // this.checkValid();
    this.platform.log.info(`Setting mode to ${value}`);
    const newStatus = this.device.status;
    switch (value) {
      case this.platform.Characteristic.TargetHeatingCoolingState.AUTO:
        newStatus.operationMode = DeviceStatus.OPERATION_MODES.auto;
        break;
      case this.platform.Characteristic.TargetHeatingCoolingState.COOL:
        newStatus.operationMode = DeviceStatus.OPERATION_MODES.cool;
        break;
      case this.platform.Characteristic.TargetHeatingCoolingState.HEAT:
        newStatus.operationMode = DeviceStatus.OPERATION_MODES.heat;
        break;
      case this.platform.Characteristic.TargetHeatingCoolingState.OFF:
        newStatus.operationMode = DeviceStatus.OPERATION_MODES.fan; // TODO
        break;
      default:
        this.platform.log.error(`Invalid mode: ${value}`);
        return;
    }
    this.device.setDeviceStatus(newStatus);
  }

  getDehumidifierActive(): CharacteristicValue {
    // this.checkValid();
    return this.device.status.operationMode === DeviceStatus.OPERATION_MODES.dry ? this.platform.Characteristic.Active.ACTIVE : this.platform.Characteristic.Active.INACTIVE;
  }

  setDehumidifierActive(value: CharacteristicValue) {
    // this.checkValid();
    this.platform.log.info(`Setting dehumidifier to ${value}`);
    const newStatus = this.device.status;
    newStatus.operationMode = value === this.platform.Characteristic.Active.ACTIVE ? DeviceStatus.OPERATION_MODES.dry : DeviceStatus.OPERATION_MODES.auto;
    this.device.setDeviceStatus(newStatus);
  }

  getCurrentHumidifierDehumidifierState(): CharacteristicValue {
    return this.device.status.operationMode === DeviceStatus.OPERATION_MODES.dry ? this.platform.Characteristic.CurrentHumidifierDehumidifierState.DEHUMIDIFYING : this.platform.Characteristic.CurrentHumidifierDehumidifierState.INACTIVE;
  }

  getTargetHumidifierDehumidifierState(): CharacteristicValue {
    return this.device.status.operationMode === DeviceStatus.OPERATION_MODES.dry ? this.platform.Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER : this.platform.Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER_OR_DEHUMIDIFIER;
  }

  setTargetHumidifierDehumidifierState(value: CharacteristicValue) {
    this.platform.log.info(`Setting dehumidifier mode to ${value}`);
    const newStatus = this.device.status;
    switch (value) {
      case this.platform.Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER_OR_DEHUMIDIFIER:
        newStatus.operationMode = DeviceStatus.OPERATION_MODES.auto;
        break;
      case this.platform.Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER:
        newStatus.operationMode = DeviceStatus.OPERATION_MODES.dry;
        break;
      default:
        this.platform.log.error(`Invalid dehumidifier mode: ${value}`);
        return;
    }
    this.device.setDeviceStatus(newStatus);
  }

}

