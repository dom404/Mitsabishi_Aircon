# Homebridge MHI WF-RAC

This is a Homebridge plugin for Mitsubishi WF-RAC air conditioners controlled by the Smart M-Air app. This plugin exposes three services to HomeKit as one device: a thermostat service for heating and cooling, a fan (which can be used additionally to the thermostat, or standalone), and a dehumidifier.

## Prerequisites

1. Configure the Smart M-Air app according to the normal instructions.
2. Set up Homebridge.

## Installation

1. Install this plugin using: 
   ```sh
   npm install -g homebridge-mhi-wfrac
   ```

2. Update your Homebridge `config.json` file with the platform configuration.

## Configuration

Add the platform in your Homebridge `config.json` file:

```json
{
  "platforms": [
    {
      "platform": "HomebridgeMHIWFRACPlatform",
      "operatorId": "YOUR_OPERATOR_ID"
    }
  ]
}
```

### Operator ID

You will need to set the Operator ID of the app you configured. Instructions for obtaining the Operator ID will be added here (TODO).

## Features

- **Thermostat Service**: For heating and cooling.
- **Fan Service**: Can be used additionally to the thermostat or standalone.
- **Dehumidifier Service**: For dehumidification.

## Limitations

- Not all settings are supported. For example, the horizontal and vertical direction of the fan cannot be managed via Homebridge.
- The outdoor temperature is not implemented yet (TODO).

## Issues

If you encounter any issues, please open an issue on the [GitHub repository](https://github.com/JobDoesburg/homebridge-mhi-wfrac/issues).

## License

This project is licensed under the Apache-2.0 License.
