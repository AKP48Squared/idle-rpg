// Changes bot settings
function Command() {
  this.names = ["admin"];
  this.perms = ["AKP48.owner", "AKP48.op", "idlerpg.admin"]; // Only a bot OP/owner can run this command
  this.admin = true;
}

Command.prototype.process = function(context) {
  var text = context.irpgText.split(" ");
  var idle = context.irpg;
  var config = idle.getConfig();
  var _case = text.shift();
  switch (_case.toLowerCase()) {
    default:
    case "info":
      var $chans = idle.getChannels();
      var online = Object.keys(idle.getOnlinePlayers()).length, total = idle.getTotalPlayers(), channels = Object.keys($chans).filter(key => $chans[key].enabled).length;
      context.reply(`Enabled: ${config.enabled} | Players: ${online}/${total} | Channels: ${channels}`);
      var p = text.shift();
      if (!p && _case.toLowerCase() !== "info") p = _case;
      if (!p) return;
      idle.getPlayer(p, function (player) {
        if (!player) return GLOBAL.logger.debug(`${p} not found`);
        context.reply(`Player: ${player.isPassword("")?"@":""}${player.toString()}`);
      });
      break;
    case "enable":
      if (config.enabled) return context.reply("Game is already enabled");
      config.enabled = true;
      context.alert("IdleRPG is now enabled", "Game is now enabled");
      idle.sendMessages("Game has been enabled!", "force");
      break;
    case "disable":
      if (!config.enabled) return context.reply("Game is already disabled");
      context.alert("IdleRPG is now disabled", "Game is now disabled");
      config.enabled = false;
      idle.sendMessages("Game has been disabled!", "force");
      break;
    case "login":
      return context.reply("Sorry, can't login as fake users at this time");
    case "delold":
    case "adjust":
      return context.reply(`${_case} not currently implemented`);
  }
};

module.exports = Command;