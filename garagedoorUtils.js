function controlGarageDoor(
  event,
  entdSwitchOpen,
  endSwitchClosed,
  currentState,
  targetState
) {
  if (entdSwitchOpen.state === "OPEN" && endSwitchClosed.state === "OPEN") {
    var state = targetState.state == 0 ? "OPENING" : "CLOSING";
    currentState.postUpdate(state);
    console.info("Garagedoor is " + state);
  }

  if (entdSwitchOpen.state === "CLOSED") {
    currentState.postUpdate("OPEN");
    console.info("Garagedoor is OPEN");
  }

  if (endSwitchClosed.state === "CLOSED") {
    currentState.postUpdate("CLOSED");
    console.info("Garagedoor is CLOSED");
  }
}

module.exports = {
  controlGarageDoor,
};
