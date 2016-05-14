const $s = require("./simple-seconds");

exports.isChannel = isChannel; // Check if "text" is a channel
exports.pad = pad; // Pad a string to given length with given padding
exports.values = values; // Gets values from an object, returns an array
exports.random = random; // Get a random value from (low to high, or 0 to low)
exports.duration = duration; // Return human readable time
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
  if (typeof low === "undefined") return 0;
  if (typeof high === "undefined") {
    high = low;
    low = 0;
  }
  return Math.floor(Math.random() * (high - low) + low);
}

function duration(time) {
  if (!/^\d+$/.test(time)) {
    return `NaN (${time})`;
  }
  var days = Math.floor(time/$s.oneDay),
    day = days == 0 ? "" : days == 1 ? "1 day, " : `${days} days, `,
    hours = util.pad(Math.floor(time%$s.oneDay/$s.oneHour), 2, "0"),
    minutes = util.pad(Math.floor(time%$s.oneHour/$s.oneMinute), 2, "0"),
    seconds = util.pad(Math.floor(time%$s.oneMinute), 2, "0");
  return `${day}${hours}:${minutes}:${seconds}`;
}
