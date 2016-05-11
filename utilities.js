exports.isChannel = isChannel; // Check if "text" is a channel
exports.pad = pad; // Pad a string to given length with given padding
exports.values = values; // Gets values from an object, returns an array
exports.random = random;
exports.item_types = ["helm", "shirt", "pants", "shoes", "gloves", "weapon", "shield", "ring", "amulet", "charm"];

function isChannel(text) {
  return /^[#&+!][^\x07\x2C\s]{0,50}$/.test(text);
}

function pad(text, length, padding) {
  text = "" + text; // Force a string
  length = length || 2;
  padding = padding || " ";
  while (text.length < length) {
    text = padding + text;
  }
  return text;
}

function values(O) {
  var vals = [];
  Object.keys(O).forEach(function (key) {
    var val = O[key];
    if (val) vals.push(val);
  });
  return vals;
}

function random(low, high) {
  if (typeof high === "undefined") {
    high = low;
    low = 0;
  }
  return Math.floor(Math.random() * (high - low) + low);
}
