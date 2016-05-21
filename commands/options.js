const util = require("../utilities");

// View/Edit individual options for a channel
function Command() {
  this.names = ["channel", "chan-opts", "options", "mode"];
  this.perms = "irc.channel.op";
}

function build(chan) {
  var str = [];
  util.forEach(chan, function (key, val) {
    if (key === "enabled") return;
    if (val === true) {
      val = "enabled";
    } else if (val === false) {
      val = "disabled";
    }
    str.push(`${key}-${val}`);
  });
  return str.join(", ");
}

function set(obj, key, value) {
  if (!obj.hasOwnProperty(key)) return `${key} does not exist`;
  var old = obj[key];
  if (old === value) return `${key} is already ${value}`;
  obj[key] = value;
  return `${key} is now ${value} from ${old}`;
}

Command.prototype.process = function(context) {
  // Make sure there's a channel
  if (!context.irpgChannel) return context.reply("Can only be used in a channel");
  var chan = context.irpg.getChannelOptions(context.irpgChannel);
  // By default list the current options
  if (context.irpgText.length === 0) {
    return context.reply(`Options: ${Object.keys(chan).filter((e) => e !== "enabled").join(", ")} (To see all values, use 'idle ${context.irpgCommand} all')`);
  }
  if (context.irpgText.toLowerCase() === "all") {
    return context.reply(`Options: ${build(chan)}`);;
  }
  context.irpgText.split(" ").forEach(function(arg) {
    var key, val = util.startsWith(arg, "+");
    if (val || util.startsWith(arg, "-")) {
      // Enable or Disable
      key = arg.substr(1);
    } else if (arg.includes("=")) {
      // Set to provided value
      var i = arg.indexOf("=");
      key = arg.substr(0, i);
      val = arg.substr(i + 1);
    } else if (!chan.hasOwnProperty(arg)) {
      return context.reply(`${arg} does not exist`);
    } else {
      return context.reply(`${arg}: ${chan[arg]}`);
    }
    context.reply(set(chan, key, val));
  });
};

module.exports = Command;