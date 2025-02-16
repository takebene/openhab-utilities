function controlThermostat(
  event,
  modeItem,
  heatSetPointItem,
  coolSetPointItem,
  currentTemperatureItem,
  valveItem
) {
  var mode = modeItem.state;
  var heatSetPoint = heatSetPointItem.quantityState;
  var coolSetPoint = coolSetPointItem.quantityState;
  var currentTemperature = currentTemperatureItem.quantityState;

  console.log('Current valve state: ' + valveItem.state);

  // Mode 0 (OFF) or Mode 2 (COOL): Valve should remain closed.
  if (mode == 0 || mode == 2) {
    if (valveItem.state === 'ON') {
      console.log('Mode is OFF or COOL. Closing valve.');
      valveItem.sendCommand('OFF');
    }
    return;
  }

  // Mode 1 (HEAT): Open valve only if temperature is below heatSetPoint.
  if (mode == 1) {
    if (currentTemperature < heatSetPoint) {
      if (valveItem.state !== 'ON') {
        console.log(
          'Mode is HEAT and temperature is below setpoint. Opening valve.'
        );
        valveItem.sendCommand('ON');
      }
    } else {
      if (valveItem.state !== 'OFF') {
        console.log(
          'Mode is HEAT and temperature is at or above setpoint. Closing valve.'
        );
        valveItem.sendCommand('OFF');
      }
    }
    return;
  }

  // Mode 3 (AUTO):
  if (mode == 3) {
    // Wenn die Temperatur den coolSetPoint erreicht oder überschreitet, Ventil schließen.
    if (currentTemperature >= coolSetPoint) {
      if (valveItem.state !== 'OFF') {
        console.log('Temperature has reached coolSetPoint. Closing valve.');
        valveItem.sendCommand('OFF');
      }
    } else if (currentTemperature <= heatSetPoint) {
      // Wenn die Temperatur den heatSetPoint erreicht oder unterschreitet, Ventil öffnen.
      if (valveItem.state !== 'ON') {
        console.log('Temperature has reached heatSetPoint. Opening valve.');
        valveItem.sendCommand('ON');
      }
    }
    return;
  }

  console.error('Unexpected mode: ' + mode);
}
module.exports = {
  controlThermostat,
};
