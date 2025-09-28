# Test Setup Guide

## Installierte Test-Tools

- **Jest**: Modernes JavaScript Testing Framework
- **Mock-System**: Vollständige OpenHAB Item Simulation

## Test-Struktur

```
tests/
├── helpers/
│   └── mockItems.js        # Mock-Hilfsfunktionen für OpenHAB Items
├── hkvUtils.test.js        # Unit Tests für controlThermostat
└── hkvUtils.integration.test.js  # Integration Tests
```

## Verfügbare Test-Commands

```bash
# Alle Tests ausführen
npm test

# Tests im Watch-Modus (automatische Neuausführung bei Änderungen)
npm run test:watch

# Tests mit Coverage-Report
npm run test:coverage
```

## Test-Kategorien

### Unit Tests (`hkvUtils.test.js`)
- Testet alle Modi (OFF, HEAT, COOL, AUTO)
- Hysterese-Verhalten
- Edge Cases und Fehlerbehandlung
- Ungültige Eingaben

### Integration Tests (`hkvUtils.integration.test.js`)
- Realistische Szenarien (Winter, Sommer, Übergangszeiten)
- Mehrere Steuerungszyklen
- Modus-Wechsel
- Fehler-Recovery

## Mock-System

Das Mock-System in `tests/helpers/mockItems.js` simuliert OpenHAB Items:

```javascript
// Einfaches Mock erstellen
const mockItem = createMockItem('OFF');

// Komplett simuliertes Thermostat-Set
const items = createThermostatMockSet({
  mode: 1,           // HEAT
  heatSetPoint: 21.0,
  coolSetPoint: 24.0,
  currentTemp: 20.0,
  valveState: 'OFF'
});
```

## Erwartete Test-Abdeckung

Die Tests decken folgende Bereiche ab:
- ✅ Alle Thermostat-Modi (OFF, HEAT, COOL, AUTO)
- ✅ Hysterese-Verhalten
- ✅ Fehlerbehandlung
- ✅ Edge Cases
- ✅ Integration

## Neue Tests hinzufügen

1. Neue Test-Datei erstellen: `tests/[moduleName].test.js`
2. Mock-Helpers verwenden oder erweitern
3. Tests nach Kategorien strukturieren (describe-Blöcke)
4. Aussagekräftige Test-Namen verwenden

## Coverage-Ziele

- **Statements**: > 95%
- **Branches**: > 90%
- **Functions**: 100%
- **Lines**: > 95%
