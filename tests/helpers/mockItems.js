/**
 * Mock-Helpers für OpenHAB Items in Tests
 */

/**
 * Erstellt ein Mock QuantityType-Objekt für Temperaturen
 */
function createQuantityType(value, unit = '°C') {
  return {
    floatValue: () => parseFloat(value),
    toUnit: (targetUnit) => ({
      floatValue: () => parseFloat(value)
    }),
    toString: () => `${value} ${unit}`
  };
}

/**
 * Erstellt ein Mock OpenHAB Item
 */
function createMockItem(initialState, initialQuantityState = null) {
  const mockItem = {
    state: initialState,
    quantityState: initialQuantityState,
    commands: [], // Protokolliert alle sendCommand-Aufrufe
    sendCommand: jest.fn()
  };

  // sendCommand Mock protokolliert Commands und ändert den State
  mockItem.sendCommand.mockImplementation((command) => {
    mockItem.commands.push(command);
    mockItem.state = command;
  });

  return mockItem;
}

/**
 * Erstellt ein Mock Thermostat Item Set
 */
function createThermostatMockSet(config = {}) {
  const defaults = {
    mode: 1, // HEAT
    heatSetPoint: 21.0,
    coolSetPoint: 24.0,
    currentTemp: 20.0,
    valveState: 'OFF'
  };

  const settings = { ...defaults, ...config };

  return {
    modeItem: createMockItem(settings.mode.toString()),
    heatSetPointItem: createMockItem(
      settings.heatSetPoint.toString(),
      createQuantityType(settings.heatSetPoint)
    ),
    coolSetPointItem: createMockItem(
      settings.coolSetPoint.toString(),
      createQuantityType(settings.coolSetPoint)
    ),
    currentTemperatureItem: createMockItem(
      settings.currentTemp.toString(),
      createQuantityType(settings.currentTemp)
    ),
    valveItem: createMockItem(settings.valveState)
  };
}

module.exports = {
  createQuantityType,
  createMockItem,
  createThermostatMockSet
};
