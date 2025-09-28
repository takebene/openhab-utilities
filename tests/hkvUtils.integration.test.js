const { controlThermostat } = require('../hkvUtils');
const { createThermostatMockSet } = require('./helpers/mockItems');

describe('controlThermostat - Integration Tests', () => {
  // Mock console für saubere Testausgabe
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  describe('Realistic Usage Scenarios', () => {
    test('Winter morning scenario: Heat mode, cold room, valve should open', () => {
      const items = createThermostatMockSet({
        mode: 1, // HEAT
        heatSetPoint: 21.0,
        coolSetPoint: 24.0,
        currentTemp: 18.5, // Kalter Morgen
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
      expect(items.valveItem.commands).toEqual(['ON']);
    });

    test('Summer scenario: Cool mode, any temperature, valve should be closed', () => {
      const items = createThermostatMockSet({
        mode: 2, // COOL
        heatSetPoint: 21.0,
        coolSetPoint: 24.0,
        currentTemp: 26.0, // Warmer Sommer
        valveState: 'ON' // Ventil war noch an
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
      expect(items.valveItem.commands).toEqual(['OFF']);
    });

    test('Auto mode spring/autumn: comfortable temperature, no action needed', () => {
      const items = createThermostatMockSet({
        mode: 3, // AUTO
        heatSetPoint: 20.0,
        coolSetPoint: 24.0,
        currentTemp: 22.0, // Komfortable Temperatur
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
      expect(items.valveItem.commands).toEqual([]);
    });

    test('Auto mode: too cold, should start heating', () => {
      const items = createThermostatMockSet({
        mode: 3, // AUTO
        heatSetPoint: 20.0,
        coolSetPoint: 24.0,
        currentTemp: 19.0, // Zu kalt
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
      expect(items.valveItem.commands).toEqual(['ON']);
    });

    test('Auto mode: too warm, should stop heating', () => {
      const items = createThermostatMockSet({
        mode: 3, // AUTO
        heatSetPoint: 20.0,
        coolSetPoint: 24.0,
        currentTemp: 24.5, // Zu warm
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
      expect(items.valveItem.commands).toEqual(['OFF']);
    });
  });

  describe('Multiple Control Cycles', () => {
    test('should simulate heating cycle from cold to warm', () => {
      const items = createThermostatMockSet({
        mode: 1, // HEAT
        heatSetPoint: 21.0,
        currentTemp: 18.0,
        valveState: 'OFF'
      });

      // Erster Zyklus: Zu kalt, Ventil öffnen
      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.commands).toEqual(['ON']);

      // Simulation: Temperatur steigt langsam
      jest.clearAllMocks();
      items.currentTemperatureItem.quantityState.floatValue = () => 20.5;

      // Zweiter Zyklus: Noch in Hysterese, kein Wechsel
      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).not.toHaveBeenCalled();

      // Simulation: Temperatur erreicht obere Schwelle
      jest.clearAllMocks();
      items.currentTemperatureItem.quantityState.floatValue = () => 21.3; // Über Hysterese-Schwelle (21 + 0.25 = 21.25)
      items.valveItem.state = 'ON'; // Ventil ist noch offen nach dem vorherigen Zyklus
      
      // Update the quantityState reference to use new temperature
      items.currentTemperatureItem.quantityState = {
        floatValue: () => 21.3,
        toUnit: () => ({ floatValue: () => 21.3 })
      };

      // Dritter Zyklus: Warm genug, Ventil schließen
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

    test('should handle mode changes correctly', () => {
      const items = createThermostatMockSet({
        mode: 1, // HEAT
        heatSetPoint: 21.0,
        currentTemp: 19.0,
        valveState: 'OFF'
      });

      // Erster Aufruf: HEAT Mode, Ventil öffnen
      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.commands).toEqual(['ON']);

      // Modus-Wechsel zu OFF
      jest.clearAllMocks();
      items.modeItem.state = '0';
      items.valveItem.state = 'ON'; // Ventil ist noch offen

      // Zweiter Aufruf: OFF Mode, Ventil schließen
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

  describe('Error Recovery Scenarios', () => {
    test('should handle system restart with unknown valve state', () => {
      const items = createThermostatMockSet({
        mode: 1, // HEAT
        heatSetPoint: 21.0,
        currentTemp: 19.0, // Zu kalt
        valveState: 'UNKNOWN' // Unbekannter Zustand nach Neustart
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      // Sollte trotzdem korrekt auf ON schalten
      expect(items.valveItem.sendCommand).toHaveBeenCalledWith('ON');
    });

    test('should continue working after temporary sensor failure', () => {
      const items = createThermostatMockSet({
        mode: 1,
        heatSetPoint: 21.0,
        valveState: 'OFF'
      });

      // Erster Aufruf: Sensor-Fehler (null temperature)
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

      // Zweiter Aufruf: Sensor funktioniert wieder
      jest.clearAllMocks();
      items.currentTemperatureItem.quantityState = {
        floatValue: () => 19.0,
        toUnit: () => ({ floatValue: () => 19.0 })
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
});
