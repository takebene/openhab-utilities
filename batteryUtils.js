/**
 * Sends a low battery notification through the Pushover service when a specified item's state changes to "ON".
 *
 * @param {Object} event - The event that triggered the function. It contains the name of the item
 *                         whose state has changed.
 *
 */
function sendLowBatteryNotification(event) {
  let item = items.getItem(event.itemName);
  if (item.state == "ON") {
    let groupNames = item.groupNames
      .map((gName) => items.getItem(gName).label)
      .join(", ");

    var action = actions.thingActions(
      "pushover",
      "pushover:pushover-account:account"
    );
    action.sendMessage(item.label, groupNames);
  }
}

module.exports = {
  sendLowBatteryNotification,
};
