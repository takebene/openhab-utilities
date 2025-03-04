function controlGarageDoor(
  event,
  endSwitchOpen,
  endSwitchClosed,
  currentState,
  targetState
) {
  if (endSwitchOpen.state === "OPEN" && endSwitchClosed.state === "OPEN") {
    var state = targetState.state == 0 ? "OPENING" : "CLOSING";
    currentState.postUpdate(state);
    console.info("Garagedoor is " + state);
  }

  if (endSwitchOpen.state === "CLOSED") {
    currentState.postUpdate("OPEN");
    targetState.postUpdate(0);
    console.info("Garagedoor is OPEN");
  }

  if (endSwitchClosed.state === "CLOSED") {
    currentState.postUpdate("CLOSED");
    targetState.postUpdate(1);
    console.info("Garagedoor is CLOSED");
  }
}

module.exports = {
  controlGarageDoor,
};
