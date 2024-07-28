import {Service, PlatformAccessory, CharacteristicValue} from 'homebridge';
import {DeviceClient, DeviceStatus} from './device.js';
import {HomebridgeMHIWFRACPlatform} from './platform.js';


export class WFRACAccessory {
  private readonly deviceName: string;
  private readonly ipAddress: string;
  private port = 51443;
  private operatorId = '12345';

  private device: DeviceClient;

  private airconService: Service;
  private fanService: Service;
  private dehumidifierService: Service;

  // private currentState = {
  //   TempInside: 21.5,
  //   TempoOutside: 28.0,
  //   TargetTemp: 21.5,
  //   On: false,
  //   Mode: Auto, Cool, Heat, Fan, Dry
  //   FanSpeed: Auto, Silent, Low, Medium, High,
  //   SwingModeVertical: All, Up, MiddleUp, MiddleDown, Down,
  //   SwingModeHorizontal: All, Left, MiddleLeft, Middle, MiddleRight, Right, Inside, Outside,
  //   Fan3D: false,
  //   EmptyHouse: false,
  // };

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

    this.airconService = this.accessory.getService(this.platform.Service.HeaterCooler) || this.accessory.addService(this.platform.Service.HeaterCooler);
    this.fanService = this.accessory.getService(this.platform.Service.Fanv2) || this.accessory.addService(this.platform.Service.Fanv2);
    this.dehumidifierService = this.accessory.getService(this.platform.Service.HumidifierDehumidifier) || this.accessory.addService(this.platform.Service.HumidifierDehumidifier);

    this.airconService.getCharacteristic(this.platform.Characteristic.Active)
      .onGet(this.getActive.bind(this))
      .onSet(this.setActive.bind(this));

    setInterval(() => {
      this.device.getDeviceStatus().then((status) => {
        this.platform.log.info(`Status: ${JSON.stringify(status)}`);
      });
    }, 10000);

    this.airconService.getCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState)
      .onGet(this.getCurrentHeaterCoolerState.bind(this));
    //
    this.airconService.getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState)
      .onGet(this.getTargetHeaterCoolerState.bind(this))
      .onSet(this.setTargetHeaterCoolerState.bind(this));

    this.airconService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getCurrentTemperature.bind(this));

  }

  getActive(): CharacteristicValue {
    // this.checkValid();
    return this.device.status.operation ? this.platform.Characteristic.Active.ACTIVE : this.platform.Characteristic.Active.INACTIVE;
  }

  setActive(value: CharacteristicValue) {
    // this.checkValid();
    this.platform.log.info(`Setting power to ${value}`);
    const newStatus = this.device.status;
    newStatus.operation = value === this.platform.Characteristic.Active.ACTIVE;
    this.device.setDeviceStatus(newStatus);
  }

  getCurrentTemperature(): CharacteristicValue {
    // this.checkValid();
    return this.device.status.indoorTemp;
  }

  getCurrentHeaterCoolerState(): CharacteristicValue {
    // this.checkValid();
    switch (this.device.status.operationMode) {
      case DeviceStatus.OPERATION_MODES.auto:
        return this.platform.Characteristic.CurrentHeaterCoolerState.IDLE; // TODO
      case DeviceStatus.OPERATION_MODES.cool:
        return this.platform.Characteristic.CurrentHeaterCoolerState.COOLING;
      case DeviceStatus.OPERATION_MODES.heat:
        return this.platform.Characteristic.CurrentHeaterCoolerState.HEATING;
      case DeviceStatus.OPERATION_MODES.fan:
        return this.platform.Characteristic.CurrentHeaterCoolerState.IDLE; // TODO
      case DeviceStatus.OPERATION_MODES.dry:
        return this.platform.Characteristic.CurrentHeaterCoolerState.IDLE; // TODO
      default:
        return this.platform.Characteristic.CurrentHeaterCoolerState.INACTIVE; // TODO
    }
  }

  getTargetHeaterCoolerState(): CharacteristicValue {
    // this.checkValid();
    switch (this.device.status.operationMode) {
      case DeviceStatus.OPERATION_MODES.auto:
        return this.platform.Characteristic.TargetHeaterCoolerState.AUTO;
      case DeviceStatus.OPERATION_MODES.cool:
        return this.platform.Characteristic.TargetHeaterCoolerState.COOL;
      case DeviceStatus.OPERATION_MODES.heat:
        return this.platform.Characteristic.TargetHeaterCoolerState.HEAT;
      case DeviceStatus.OPERATION_MODES.fan:
        return this.platform.Characteristic.TargetHeaterCoolerState.AUTO; // TODO
      case DeviceStatus.OPERATION_MODES.dry:
        return this.platform.Characteristic.TargetHeaterCoolerState.AUTO; // TODO
      default:
        return this.platform.Characteristic.TargetHeaterCoolerState.AUTO; // TODO
    }
  }

  setTargetHeaterCoolerState(value: CharacteristicValue) {
    // this.checkValid();
    this.platform.log.info(`Setting mode to ${value}`);
    const newStatus = this.device.status;
    switch (value) {
      case this.platform.Characteristic.TargetHeaterCoolerState.AUTO:
        newStatus.operationMode = DeviceStatus.OPERATION_MODES.auto;
        break;
      case this.platform.Characteristic.TargetHeaterCoolerState.COOL:
        newStatus.operationMode = DeviceStatus.OPERATION_MODES.cool;
        break;
      case this.platform.Characteristic.TargetHeaterCoolerState.HEAT:
        newStatus.operationMode = DeviceStatus.OPERATION_MODES.heat;
        break;
      default:
        this.platform.log.error(`Invalid mode: ${value}`);
        return;
    }
    this.device.setDeviceStatus(newStatus);
  }
}

