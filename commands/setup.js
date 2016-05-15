// [Un]Registers your channel to play the game
function Command() {
  this.names = ["add", "remove"];
  this.perms = "irc.channel.op";
  this.bypass = true; // Need to bypass to register
}

Command.prototype.process = function(context) {
  if (context.isPM) context.reply("You must use this command in a channel where you are an OP");
  var chanOpts = context.irpg.getChannelOptions(context.irpgChannel);
  switch (context.irpgCommand.toLowerCase()) {
    default: // Not currently possible
      return context.reply(`Channel is currently ${context.irpgEnabled ? "":"not"} participating in IdleRPG.`);
    case "add":
      if (context.irpgEnabled) {
        return context.reply("This channel is already participating");
      }
      context.alert(`IdleRPG: ${context.irpgChannel} now participating`, `Now participating! Join by messaging me with: 'idle join <name> <pass> [class]'. Login with 'idle login <name> <pass>'`);
      chanOpts.enabled = true;
      break;
    case "remove":
      if (!context.irpgEnabled) {
        return context.reply("This channel is not participating");
      }
      context.alert(`IdleRPG: ${context.irpgChannel} no longer participating`, "No longer participating!");
      chanOpts.enabled = false;
      break;
  }
};


module.exports = Command;