const { controlThermostat } = require('../hkvUtils');
const { createThermostatMockSet, createQuantityType } = require('./helpers/mockItems');

// Mock console.log und console.warn für saubere Testausgabe
const originalConsole = console;
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

describe('controlThermostat', () => {
  describe('Mode 0 (OFF)', () => {
    test('should close valve when mode is OFF and valve is open', () => {
      const items = createThermostatMockSet({
        mode: 0,
        valveState: 'ON'
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).toHaveBeenCalledWith('OFF');
    });

    test('should keep valve closed when mode is OFF and valve is already closed', () => {
      const items = createThermostatMockSet({
        mode: 0,
        valveState: 'OFF'
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).not.toHaveBeenCalled();
    });
  });

  describe('Mode 1 (HEAT)', () => {
    test('should open valve when temperature is below threshold', () => {
      const items = createThermostatMockSet({
        mode: 1,
        heatSetPoint: 21.0,
        currentTemp: 20.0, // Unter der Hysterese-Schwelle (21 - 0.25 = 20.75)
        valveState: 'OFF'
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).toHaveBeenCalledWith('ON');
    });

    test('should close valve when temperature is above threshold', () => {
      const items = createThermostatMockSet({
        mode: 1,
        heatSetPoint: 21.0,
        currentTemp: 22.0, // Über der Hysterese-Schwelle (21 + 0.25 = 21.25)
        valveState: 'ON'
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).toHaveBeenCalledWith('OFF');
    });

    test('should not change valve state within hysteresis band', () => {
      const items = createThermostatMockSet({
        mode: 1,
        heatSetPoint: 21.0,
        currentTemp: 21.0, // Exakt am Setpoint, innerhalb der Hysterese
        valveState: 'ON'
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).not.toHaveBeenCalled();
    });

    test('should handle missing heat setpoint gracefully', () => {
      const items = createThermostatMockSet({
        mode: 1,
        currentTemp: 20.0,
        valveState: 'OFF'
      });
      
      // Setze heatSetPoint auf NaN
      items.heatSetPointItem.quantityState = createQuantityType(NaN);

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith('HEAT: missing heat setpoint — doing nothing.');
    });
  });

  describe('Mode 2 (COOL)', () => {
    test('should close valve when mode is COOL and valve is open', () => {
      const items = createThermostatMockSet({
        mode: 2,
        valveState: 'ON'
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).toHaveBeenCalledWith('OFF');
    });

    test('should keep valve closed when mode is COOL and valve is already closed', () => {
      const items = createThermostatMockSet({
        mode: 2,
        valveState: 'OFF'
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).not.toHaveBeenCalled();
    });
  });

  describe('Mode 3 (AUTO)', () => {
    test('should close valve when temperature is above cool setpoint', () => {
      const items = createThermostatMockSet({
        mode: 3,
        heatSetPoint: 20.0,
        coolSetPoint: 24.0,
        currentTemp: 24.5, // Über dem Kühl-Threshold
        valveState: 'ON'
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).toHaveBeenCalledWith('OFF');
    });

    test('should open valve when temperature is below heat setpoint in AUTO mode', () => {
      const items = createThermostatMockSet({
        mode: 3,
        heatSetPoint: 20.0,
        coolSetPoint: 24.0,
        currentTemp: 19.0, // Unter dem Heat-Threshold
        valveState: 'OFF'
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).toHaveBeenCalledWith('ON');
    });

    test('should handle overlapping setpoints by enforcing minimum gap', () => {
      const items = createThermostatMockSet({
        mode: 3,
        heatSetPoint: 22.0,
        coolSetPoint: 21.0, // Niedriger als heatSetPoint - wird angepasst
        currentTemp: 23.5, // Über dem angepassten coolSetPoint (22 + 1.0 = 23)
        valveState: 'ON'
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      // Sollte das Ventil schließen, da Temperatur über angepasstem coolSetPoint liegt
      expect(items.valveItem.sendCommand).toHaveBeenCalledWith('OFF');
    });

    test('should not change valve state in comfort zone between setpoints', () => {
      const items = createThermostatMockSet({
        mode: 3,
        heatSetPoint: 20.0,
        coolSetPoint: 24.0,
        currentTemp: 22.0, // Zwischen den Setpoints
        valveState: 'OFF'
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).not.toHaveBeenCalled();
    });

    test('should handle missing setpoints gracefully', () => {
      const items = createThermostatMockSet({
        mode: 3,
        currentTemp: 20.0,
        valveState: 'OFF'
      });
      
      // Setze beide Setpoints auf NaN
      items.heatSetPointItem.quantityState = createQuantityType(NaN);
      items.coolSetPointItem.quantityState = createQuantityType(NaN);

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith('AUTO: missing heat setpoint — doing nothing.');
    });
  });

  describe('Edge Cases', () => {
    test('should handle invalid mode gracefully', () => {
      const items = createThermostatMockSet({
        mode: 99 // Ungültiger Modus
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(console.error).toHaveBeenCalledWith('Unexpected mode: 99');
      expect(items.valveItem.sendCommand).not.toHaveBeenCalled();
    });

    test('should handle invalid current temperature gracefully', () => {
      const items = createThermostatMockSet({
        mode: 1
      });
      
      // Setze currentTemp auf null/undefined
      items.currentTemperatureItem.quantityState = null;

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(console.warn).toHaveBeenCalledWith('No valid current temperature — doing nothing.');
      expect(items.valveItem.sendCommand).not.toHaveBeenCalled();
    });

    test('should handle string temperature values', () => {
      const items = createThermostatMockSet({
        mode: 1,
        heatSetPoint: 21.0,
        valveState: 'OFF'
      });

      // Simuliere String-Werte wie sie von OpenHAB kommen können
      items.currentTemperatureItem.quantityState = {
        toString: () => '19.5 °C',
        toUnit: () => ({ floatValue: () => 19.5 }),
        floatValue: () => 19.5
      };

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).toHaveBeenCalledWith('ON');
    });
  });

  describe('Hysteresis Behavior', () => {
    test('should respect hysteresis to prevent valve chattering', () => {
      const items = createThermostatMockSet({
        mode: 1,
        heatSetPoint: 21.0,
        currentTemp: 21.1, // Knapp über Setpoint, aber noch in Hysterese
        valveState: 'ON'
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      // Ventil sollte nicht geschaltet werden (innerhalb Hysterese-Band)
      expect(items.valveItem.sendCommand).not.toHaveBeenCalled();
    });

    test('should switch valve when clearly outside hysteresis band', () => {
      const items = createThermostatMockSet({
        mode: 1,
        heatSetPoint: 21.0,
        currentTemp: 21.5, // Klar über Hysterese-Schwelle (21 + 0.25 = 21.25)
        valveState: 'ON'
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).toHaveBeenCalledWith('OFF');
    });
  });
});
