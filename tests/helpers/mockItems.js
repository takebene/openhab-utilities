/**
 * Mock helpers for OpenHAB Items in tests
 */

/**
 * Creates a mock QuantityType object for temperatures
 */
function createQuantityType(value, unit = "°C") {
  return {
    floatValue: () => parseFloat(value),
    toUnit: (targetUnit) => ({
      floatValue: () => parseFloat(value),
    }),
    toString: () => `${value} ${unit}`,
  };
}

/**
 * Creates a mock OpenHAB Item
 */
function createMockItem(initialState, initialQuantityState = null) {
  const mockItem = {
    state: initialState,
    quantityState: initialQuantityState,
    commands: [], // Logs all sendCommand calls
    sendCommand: jest.fn(),
  };

  // sendCommand mock logs commands and changes state
  mockItem.sendCommand.mockImplementation((command) => {
    mockItem.commands.push(command);
    mockItem.state = command;
  });

  return mockItem;
}

/**
 * Creates a mock thermostat item set
 */
function createThermostatMockSet(config = {}) {
  const defaults = {
    mode: 1, // HEAT
    heatSetPoint: 21.0,
    coolSetPoint: 24.0,
    currentTemp: 20.0,
    valveState: "OFF",
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
    valveItem: createMockItem(settings.valveState),
  };
}

module.exports = {
  createQuantityType,
  createMockItem,
  createThermostatMockSet,
};
