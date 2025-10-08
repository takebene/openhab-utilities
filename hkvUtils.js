function controlThermostat(
  event,
  modeItem,
  heatSetPointItem,
  coolSetPointItem,
  currentTemperatureItem,
  valveItem
) {
  // --- Tunables ---
  const HEAT_HYST = 0.5; // °C hysteresis for heating (prevents chattering)
  const COOL_HYST = 0.5; // °C hysteresis for "close if too warm" in AUTO
  const AUTO_GAP = 1.0; // °C minimum gap between heat and cool in AUTO (logic only)

  // --- Helper: normalize QuantityType -> number (°C) ---
  const toC = (q) => {
    if (q == null) return NaN;
    try {
      // openHAB QuantityType path
      if (typeof q.toUnit === "function") return q.toUnit("°C").floatValue();
      if (typeof q.floatValue === "function") return q.floatValue();
    } catch (e) {}
    // Fallback: parse string/number
    return parseFloat(String(q));
  };

  // Modes: 0=OFF, 1=AUTO, 3=COOL, 4=HEAT
  const mode = parseInt(String(modeItem.state), 10);
  const heatSet = toC(heatSetPointItem.quantityState);
  const coolSet = toC(coolSetPointItem.quantityState);
  const temp = toC(currentTemperatureItem.quantityState);
  const valve = String(valveItem.state); // "ON" | "OFF"

  console.log(
    `Mode=${mode}  T=${temp}°C  HeatSet=${heatSet}°C  CoolSet=${coolSet}°C  Valve=${valve}`
  );

  // Guard: if we don't have a valid current temperature, do nothing.
  if (Number.isNaN(temp)) {
    console.warn("No valid current temperature — doing nothing.");
    return;
  }

  // OFF or COOL => heating valve must be closed
  if (mode === 0 || mode === 3) {
    if (valve !== "OFF") {
      console.log("Mode OFF/COOL -> close valve");
      valveItem.sendCommand("OFF");
    }
    return;
  }

  // HEAT: maintain around the heating setpoint with hysteresis
  if (mode === 4) {
    if (!Number.isNaN(heatSet)) {
      const onThreshold = heatSet - HEAT_HYST / 2; // open when clearly below
      const offThreshold = heatSet + HEAT_HYST / 2; // close when clearly above

      if (temp <= onThreshold && valve !== "ON") {
        console.log(`HEAT: T<=${onThreshold} -> open valve`);
        valveItem.sendCommand("ON");
      } else if (temp >= offThreshold && valve !== "OFF") {
        console.log(`HEAT: T>=${offThreshold} -> close valve`);
        valveItem.sendCommand("OFF");
      } else {
        console.log("HEAT: within hysteresis band -> keep current state");
      }
    } else {
      console.warn("HEAT: missing heat setpoint — doing nothing.");
    }
    return;
  }

  // AUTO: heating valve participates only in heating.
  // If near/above cool setpoint, keep it closed; otherwise follow HEAT logic.
  if (mode === 1) {
    // Enforce a minimum logical gap so Heat and Cool don't conflict
    let coolForLogic = coolSet;
    if (
      !Number.isNaN(heatSet) &&
      !Number.isNaN(coolSet) &&
      coolSet < heatSet + AUTO_GAP
    ) {
      coolForLogic = heatSet + AUTO_GAP;
    }

    // 1) Too warm (near/above cooling target) -> valve must be closed
    if (!Number.isNaN(coolForLogic) && temp >= coolForLogic - COOL_HYST / 2) {
      if (valve !== "OFF") {
        console.log(
          `AUTO: T>=CoolSet(${coolForLogic})-${COOL_HYST / 2} -> close valve`
        );
        valveItem.sendCommand("OFF");
      } else {
        console.log("AUTO: warm enough -> valve stays closed");
      }
      return;
    }

    // 2) Otherwise, apply HEAT logic around heat setpoint
    if (!Number.isNaN(heatSet)) {
      const onThreshold = heatSet - HEAT_HYST / 2;

      if (temp <= onThreshold && valve !== "ON") {
        console.log(`AUTO/HEAT: T<=${onThreshold} -> open valve`);
        valveItem.sendCommand("ON");
      } else {
        console.log("AUTO/HEAT: in comfort zone -> keep current state");
      }
    } else {
      console.warn("AUTO: missing heat setpoint — doing nothing.");
    }
    return;
  }

  console.error("Unexpected mode: " + mode);
}

module.exports = { controlThermostat };
