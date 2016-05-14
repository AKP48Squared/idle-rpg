// View/Edit individual options for a channel
function Command() {
  this.names = ["channel", "chan-opts", "options"];
  this.perms = "irc.channel.op";
}

Command.prototype.process = function(context) {
  // Make sure there's a channel
  var options = context.irpg.getChannelOptions(context.irpgChannel);
  // By default list the current options
  // Otherwise change the option to the provided value
};

module.exports = Command;