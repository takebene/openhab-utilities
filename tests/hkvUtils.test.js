const { controlThermostat } = require("../hkvUtils");
const {
  createThermostatMockSet,
  createQuantityType,
} = require("./helpers/mockItems");

// Mock console.log and console.warn for clean test output
const originalConsole = console;
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;      // Log the progression for visual inspection (will show in test output)
      console.log("\nTemperature progression:");
      temperatureSteps.forEach(step => {
        const marker = step.stateChanged ? " ← CHANGE" : "";
        console.log(`${step.temperature}°C: Valve ${step.valveState}${marker}`);
      });
    });

    test("AUTO mode: bug fix test - valve should NOT turn off at heat threshold", () => {
      // This test replicates the user's real scenario
      const items = createThermostatMockSet({
        mode: 1, // AUTO
        heatSetPoint: 17.5,
        coolSetPoint: 21.5,
        currentTemp: 17.0, // Start cold
        valveState: "OFF"
      });

      const testResults = [];

      // Test the exact scenario from user's logs
      const testTemperatures = [17.0, 17.5, 18.0, 19.0, 20.0, 21.0, 21.3, 21.6];
      let currentValveState = "OFF";

      testTemperatures.forEach(temp => {
        jest.clearAllMocks();
        
        items.currentTemperatureItem.quantityState = {
          floatValue: () => temp,
          toUnit: () => ({ floatValue: () => temp })
        };
        items.valveItem.state = currentValveState;

        controlThermostat(
          null,
          items.modeItem,
          items.heatSetPointItem,
          items.coolSetPointItem,
          items.currentTemperatureItem,
          items.valveItem
        );

        if (items.valveItem.sendCommand.mock.calls.length > 0) {
          currentValveState = items.valveItem.sendCommand.mock.calls[0][0];
        }

        testResults.push({
          temperature: temp,
          valveState: currentValveState
        });
      });

      // Expected behavior after bug fix:
      // Heat threshold: 17.25°C (17.5 - 0.25)  
      // Cool threshold: 21.25°C (21.5 - 0.25)

      const result17 = testResults.find(r => r.temperature === 17.0);
      const result175 = testResults.find(r => r.temperature === 17.5);
      const result18 = testResults.find(r => r.temperature === 18.0);
      const result20 = testResults.find(r => r.temperature === 20.0);
      const result213 = testResults.find(r => r.temperature === 21.3);

      // Verify corrected behavior
      expect(result17.valveState).toBe("ON");   // Should turn ON (cold)
      expect(result175.valveState).toBe("ON");  // Should stay ON (comfort zone)
      expect(result18.valveState).toBe("ON");   // Should stay ON (comfort zone) - BUG FIX!
      expect(result20.valveState).toBe("ON");   // Should stay ON (comfort zone)
      expect(result213.valveState).toBe("OFF");  // Should turn OFF (too warm)

      // Log results for verification
      console.log("\nBug fix verification:");
      testResults.forEach(result => {
        console.log(`${result.temperature}°C: Valve ${result.valveState}`);
      });
    });
  });

  describe("Mode 0 (OFF)", () => {
    test("should close valve when mode is OFF and valve is open", () => {
      const items = createThermostatMockSet({
        mode: 0,
        valveState: "ON",
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).toHaveBeenCalledWith("OFF");
    });

    test("should keep valve closed when mode is OFF and valve is already closed", () => {
      const items = createThermostatMockSet({
        mode: 0,
        valveState: "OFF",
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

  describe("Mode 4 (HEAT)", () => {
    test("should open valve when temperature is below threshold", () => {
      const items = createThermostatMockSet({
        mode: 4,
        heatSetPoint: 21.0,
        currentTemp: 20.0, // Below hysteresis threshold (21 - 0.25 = 20.75)
        valveState: "OFF",
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).toHaveBeenCalledWith("ON");
    });

    test("should close valve when temperature is above threshold", () => {
      const items = createThermostatMockSet({
        mode: 4,
        heatSetPoint: 21.0,
        currentTemp: 22.0, // Above hysteresis threshold (21 + 0.25 = 21.25)
        valveState: "ON",
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).toHaveBeenCalledWith("OFF");
    });

    test("should not change valve state within hysteresis band", () => {
      const items = createThermostatMockSet({
        mode: 4,
        heatSetPoint: 21.0,
        currentTemp: 21.0, // Exactly at setpoint, within hysteresis
        valveState: "ON",
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

    test("should handle missing heat setpoint gracefully", () => {
      const items = createThermostatMockSet({
        mode: 4,
        currentTemp: 20.0,
        valveState: "OFF",
      });

      // Set heatSetPoint to NaN
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
      expect(console.warn).toHaveBeenCalledWith(
        "HEAT: missing heat setpoint — doing nothing."
      );
    });
  });

  describe("Mode 3 (COOL)", () => {
    test("should close valve when mode is COOL and valve is open", () => {
      const items = createThermostatMockSet({
        mode: 3,
        valveState: "ON",
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).toHaveBeenCalledWith("OFF");
    });

    test("should keep valve closed when mode is COOL and valve is already closed", () => {
      const items = createThermostatMockSet({
        mode: 3,
        valveState: "OFF",
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

  describe("Mode 1 (AUTO)", () => {
    test("should close valve when temperature is above cool setpoint", () => {
      const items = createThermostatMockSet({
        mode: 1,
        heatSetPoint: 20.0,
        coolSetPoint: 24.0,
        currentTemp: 24.5, // Above cool threshold
        valveState: "ON",
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).toHaveBeenCalledWith("OFF");
    });

    test("should open valve when temperature is below heat setpoint in AUTO mode", () => {
      const items = createThermostatMockSet({
        mode: 1,
        heatSetPoint: 20.0,
        coolSetPoint: 24.0,
        currentTemp: 19.0, // Below heat threshold
        valveState: "OFF",
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).toHaveBeenCalledWith("ON");
    });

    test("should handle overlapping setpoints by enforcing minimum gap", () => {
      const items = createThermostatMockSet({
        mode: 1,
        heatSetPoint: 22.0,
        coolSetPoint: 21.0, // Lower than heatSetPoint - will be adjusted
        currentTemp: 23.5, // Above adjusted coolSetPoint (22 + 1.0 = 23)
        valveState: "ON",
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      // Should close valve since temperature is above adjusted coolSetPoint
      expect(items.valveItem.sendCommand).toHaveBeenCalledWith("OFF");
    });

    test("should not change valve state in comfort zone between setpoints", () => {
      const items = createThermostatMockSet({
        mode: 1,
        heatSetPoint: 20.0,
        coolSetPoint: 24.0,
        currentTemp: 22.0, // Between setpoints
        valveState: "OFF",
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

    test("should handle missing setpoints gracefully", () => {
      const items = createThermostatMockSet({
        mode: 1,
        currentTemp: 20.0,
        valveState: "OFF",
      });

      // Set both setpoints to NaN
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
      expect(console.warn).toHaveBeenCalledWith(
        "AUTO: missing heat setpoint — doing nothing."
      );
    });
  });

  describe("Edge Cases", () => {
    test("should handle invalid mode gracefully", () => {
      const items = createThermostatMockSet({
        mode: 99, // Invalid mode
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(console.error).toHaveBeenCalledWith("Unexpected mode: 99");
      expect(items.valveItem.sendCommand).not.toHaveBeenCalled();
    });

    test("should handle invalid current temperature gracefully", () => {
      const items = createThermostatMockSet({
        mode: 4,
      });

      // Set currentTemp to null/undefined
      items.currentTemperatureItem.quantityState = null;

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(console.warn).toHaveBeenCalledWith(
        "No valid current temperature — doing nothing."
      );
      expect(items.valveItem.sendCommand).not.toHaveBeenCalled();
    });

    test("should handle string temperature values", () => {
      const items = createThermostatMockSet({
        mode: 4,
        heatSetPoint: 21.0,
        valveState: "OFF",
      });

      // Simulate string values as they can come from OpenHAB
      items.currentTemperatureItem.quantityState = {
        toString: () => "19.5 °C",
        toUnit: () => ({ floatValue: () => 19.5 }),
        floatValue: () => 19.5,
      };

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).toHaveBeenCalledWith("ON");
    });
  });

  describe("Hysteresis Behavior", () => {
    test("should respect hysteresis to prevent valve chattering", () => {
      const items = createThermostatMockSet({
        mode: 4,
        heatSetPoint: 21.0,
        currentTemp: 21.1, // Just above setpoint, but still in hysteresis
        valveState: "ON",
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      // Valve should not be switched (within hysteresis band)
      expect(items.valveItem.sendCommand).not.toHaveBeenCalled();
    });

    test("should switch valve when clearly outside hysteresis band", () => {
      const items = createThermostatMockSet({
        mode: 4,
        heatSetPoint: 21.0,
        currentTemp: 21.5, // Clearly above hysteresis threshold (21 + 0.25 = 21.25)
        valveState: "ON",
      });

      controlThermostat(
        null,
        items.modeItem,
        items.heatSetPointItem,
        items.coolSetPointItem,
        items.currentTemperatureItem,
        items.valveItem
      );

      expect(items.valveItem.sendCommand).toHaveBeenCalledWith("OFF");
    });
  });

  describe("Temperature Sweep Tests", () => {
    test("AUTO mode: simulates temperature rise from cold to warm", () => {
      const items = createThermostatMockSet({
        mode: 1, // AUTO
        heatSetPoint: 20.0,
        coolSetPoint: 24.0,
        currentTemp: 19.0, // Start cold
        valveState: "OFF",
      });

      const temperatureSteps = [];
      let currentValveState = "OFF";

      // Simulate temperature rising from 19°C to 25°C
      const temperatures = [
        19.0, 19.5, 19.7, 19.8, 20.0, 20.5, 21.0, 21.5, 22.0, 22.5, 23.0, 23.5,
        23.7, 23.8, 24.0, 24.5, 25.0,
      ];

      temperatures.forEach((temp) => {
        jest.clearAllMocks();

        // Update temperature
        items.currentTemperatureItem.quantityState = {
          floatValue: () => temp,
          toUnit: () => ({ floatValue: () => temp }),
        };
        items.valveItem.state = currentValveState;

        // Run control function
        controlThermostat(
          null,
          items.modeItem,
          items.heatSetPointItem,
          items.coolSetPointItem,
          items.currentTemperatureItem,
          items.valveItem
        );

        // Check if valve state changed
        let stateChanged = false;
        if (items.valveItem.sendCommand.mock.calls.length > 0) {
          const newState = items.valveItem.sendCommand.mock.calls[0][0];
          currentValveState = newState;
          stateChanged = true;
        }

        temperatureSteps.push({
          temperature: temp,
          valveState: currentValveState,
          stateChanged: stateChanged,
        });
      });

      // Verify key behaviors:
      // 1. At cold temperatures (≤19.75°C), valve should be ON
      const coldSteps = temperatureSteps.filter(
        (step) => step.temperature <= 19.75
      );
      expect(coldSteps.every((step) => step.valveState === "ON")).toBe(true);

      // 2. At warm temperatures (≥23.75°C), valve should be OFF
      const warmSteps = temperatureSteps.filter(
        (step) => step.temperature >= 23.75
      );
      expect(warmSteps.every((step) => step.valveState === "OFF")).toBe(true);

      // 3. There should be transitions in the data
      const transitions = temperatureSteps.filter((step) => step.stateChanged);
      expect(transitions.length).toBeGreaterThan(0);

      // Log the progression for visual inspection (will show in test output)
      console.log("\nTemperature progression:");
      temperatureSteps.forEach((step) => {
        const marker = step.stateChanged ? " ← CHANGE" : "";
        console.log(`${step.temperature}°C: Valve ${step.valveState}${marker}`);
      });
    });

    test("AUTO mode: complete temperature sweep shows valve behavior progression", () => {
      const items = createThermostatMockSet({
        mode: 1, // AUTO
        heatSetPoint: 20.0,
        coolSetPoint: 24.0,
        currentTemp: 21.0,
        valveState: "OFF",
      });

      const results = [];
      let currentValveState = "OFF";

      // Key temperature points to test
      const testTemps = [
        19.6, 19.7, 19.8, 20.0, 21.0, 22.0, 23.0, 23.7, 23.8, 24.0, 24.5,
      ];

      testTemps.forEach((temp) => {
        jest.clearAllMocks();

        items.currentTemperatureItem.quantityState = {
          floatValue: () => temp,
          toUnit: () => ({ floatValue: () => temp }),
        };
        items.valveItem.state = currentValveState;

        controlThermostat(
          null,
          items.modeItem,
          items.heatSetPointItem,
          items.coolSetPointItem,
          items.currentTemperatureItem,
          items.valveItem
        );

        let actionTaken = "no change";
        if (items.valveItem.sendCommand.mock.calls.length > 0) {
          const newState = items.valveItem.sendCommand.mock.calls[0][0];
          actionTaken = `${currentValveState} → ${newState}`;
          currentValveState = newState;
        }

        results.push({
          temperature: temp,
          valveState: currentValveState,
          action: actionTaken,
        });
      });

      // Check that we have the expected pattern:
      // 1. Cold temps: valve turns ON
      // 2. Comfort zone: valve stays ON (or no change if already appropriate)
      // 3. Warm temps: valve turns OFF

      const coldResult = results.find((r) => r.temperature === 19.7);
      const warmResult = results.find((r) => r.temperature === 23.8);

      expect(coldResult.valveState).toBe("ON"); // Should be heating at cold temp
      expect(warmResult.valveState).toBe("OFF"); // Should be off at warm temp

      // Verify transitions happened
      const transitions = results.filter((r) => r.action !== "no change");
      expect(transitions.length).toBeGreaterThan(0); // Should have at least one transition
    });

    test("HEAT mode: temperature sweep should show hysteresis behavior", () => {
      const items = createThermostatMockSet({
        mode: 4, // HEAT
        heatSetPoint: 21.0,
        currentTemp: 19.0,
        valveState: "OFF",
      });

      const valveChanges = [];
      let currentValveState = "OFF";

      // Temperature sweep from 19°C to 23°C
      for (let temp = 19.0; temp <= 23.0; temp += 0.1) {
        temp = Math.round(temp * 10) / 10;

        jest.clearAllMocks();

        items.currentTemperatureItem.quantityState = {
          floatValue: () => temp,
          toUnit: () => ({ floatValue: () => temp }),
        };

        items.valveItem.state = currentValveState;

        controlThermostat(
          null,
          items.modeItem,
          items.heatSetPointItem,
          items.coolSetPointItem,
          items.currentTemperatureItem,
          items.valveItem
        );

        if (items.valveItem.sendCommand.mock.calls.length > 0) {
          const newState = items.valveItem.sendCommand.mock.calls[0][0];
          valveChanges.push({
            temperature: temp,
            from: currentValveState,
            to: newState,
          });
          currentValveState = newState;
        }
      }

      // Expected:
      // 1. OFF → ON at 20.75°C (21.0 - 0.25)
      // 2. ON → OFF at 21.25°C (21.0 + 0.25)

      expect(valveChanges).toHaveLength(2);
      expect(valveChanges[0].temperature).toBeLessThanOrEqual(20.75);
      expect(valveChanges[0].to).toBe("ON");
      expect(valveChanges[1].temperature).toBeGreaterThanOrEqual(21.25);
      expect(valveChanges[1].to).toBe("OFF");
    });

    test("AUTO mode: cooling scenario - valve should stay closed even when temperature drops", () => {
      const items = createThermostatMockSet({
        mode: 1, // AUTO
        heatSetPoint: 20.0,
        coolSetPoint: 24.0,
        currentTemp: 25.0, // Start warm
        valveState: "ON", // Start with valve open
      });

      const valveChanges = [];
      let currentValveState = "ON";

      // Temperature drops from 25°C to 19°C
      for (let temp = 25.0; temp >= 19.0; temp -= 0.2) {
        temp = Math.round(temp * 10) / 10;

        jest.clearAllMocks();

        items.currentTemperatureItem.quantityState = {
          floatValue: () => temp,
          toUnit: () => ({ floatValue: () => temp }),
        };

        items.valveItem.state = currentValveState;

        controlThermostat(
          null,
          items.modeItem,
          items.heatSetPointItem,
          items.coolSetPointItem,
          items.currentTemperatureItem,
          items.valveItem
        );

        if (items.valveItem.sendCommand.mock.calls.length > 0) {
          const newState = items.valveItem.sendCommand.mock.calls[0][0];
          valveChanges.push({
            temperature: temp,
            from: currentValveState,
            to: newState,
          });
          currentValveState = newState;
        }
      }

      // Expected: Only two changes - valve turns OFF at 23.75°C and ON again at 19.75°C
      expect(valveChanges).toHaveLength(2);

      // First: ON → OFF when too warm (≥23.75°C)
      expect(valveChanges[0].to).toBe("OFF");
      expect(valveChanges[0].temperature).toBeGreaterThanOrEqual(23.75);

      // Second: OFF → ON when too cold (≤19.75°C)
      expect(valveChanges[1].to).toBe("ON");
      expect(valveChanges[1].temperature).toBeLessThanOrEqual(19.75);
    });
  });
});
