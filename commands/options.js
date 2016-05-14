// View/Edit individual options for a channel
function Command() {
  this.names = ["channel", "chan-opts", "options"];
  this.perms = "irc.channel.op";
}

function build(object) {
  var str = [];
  Object.keys(object).forEach(function (key) {
    var val = object[key];
    if (val === true) {
      val = "enabled";
    } else if (val === false) {
      val = "disabled";
    }
    str.push(`${key}-${val}`);
  });
  return str.join(", ");
}

Command.prototype.process = function(context) {
  // Make sure there's a channel
  var options = {};
  var chan = context.irpg.getChannelOptions(context.irpgChannel);
  Object.keys(chan).forEach(function (key) {
    if (key !== "enabled") options[key] = chan[key];
  });
  // By default list the current options
  if (context.irpgText.length === 0) {
    return context.reply(`Options: ${build(options)}`);
  }
  var args = context.irpgText.split(" ");
  context.reply("To be implemented");
  // If option and no value, explain the option
  // Otherwise change the option to the provided value
};

module.exports = Command;