# Homebridge MHI WF-RAC

This is a Homebridge plugin for Mitsubishi WF-RAC air conditioners controlled by the Smart M-Air app. This plugin exposes three services to HomeKit as one device: a thermostat service for heating and cooling, a fan (which can be used additionally to the thermostat, or standalone), and a dehumidifier.

## Prerequisites

1. **Smart M-Air App Configuration**: Configure the Smart M-Air app according to the normal instructions provided by Mitsubishi.
2. **Homebridge Setup**: Ensure you have Homebridge installed and set up on your system.

## Installation

1. **Install the Plugin**: Install this plugin globally using npm:
   ```sh
   npm install -g homebridge-mhi-wfrac
   ```

2. **Update Homebridge Configuration**: Update your Homebridge `config.json` file with the platform configuration.

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

- **Fan Direction Control**: The horizontal and vertical direction of the fan cannot be managed via Homebridge.
- **Outdoor Temperature**: The outdoor temperature is not implemented yet (TODO).

## Troubleshooting

If you encounter any issues, please follow these steps:

1. **Check Logs**: Review the Homebridge logs for any error messages or warnings.
2. **Configuration**: Ensure your `config.json` is correctly configured.
3. **Network**: Verify that your Homebridge server and the Mitsubishi air conditioner are on the same network.

If the issue persists, please open an issue on the [GitHub repository](https://github.com/JobDoesburg/homebridge-mhi-wfrac/issues).

## Contributing

We welcome contributions to this project. If you have an idea for a new feature or have found a bug, please open an issue or submit a pull request.

## License

This project is licensed under the Apache-2.0 License. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

This plugin was developed with the help of the Homebridge community and the documentation provided by Mitsubishi Heavy Industries.
