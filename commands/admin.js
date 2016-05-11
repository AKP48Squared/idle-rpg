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
  //GLOBAl.logger.debug(idle);
  var _case = text.shift();
  switch (_case.toLowerCase()) {
    default:
    case "info":
      var $chans = idle.getChannels();
      var online = Object.keys(idle.getOnlinePlayers()).length, total = idle.getTotalPlayers(), channels = Object.keys($chans).filter(key => $chans[key].enabled).length;
      context.reply(`Enabled: ${config.enabled} | Players: ${online}/${total} | Channels: ${channels}`);
      var p = text.shift();
      if (!p && _case !== "info") p = _case;
      if (!p) return;
      idle.getPlayer(p, function (player) {
        if (!player) return GLOBAL.logger.debug(`${p} not found`);
        var types = { // TODO: make this available everywhere
          helm: "Helmet",
          shirt: "Shirt",
          pants: "Pants",
          shoes: "Shoes",
          gloves: "Gloves",
          weapon: "Weapon",
          shield: "Shield",
          ring: "Ring",
          amulet: "Amulet",
          charm: "Charm",
        };
        var items = [];
        for (var key of Object.keys(types)) {
          items.push(`${types[key]}(${player.getItem(key)})`);
        }
        context.reply(`Player: ${player.isPassword("")?"@":""}${player.getName()}(${player.getLevel()}) the ${player.getClass()}, will level in ${idle.duration(player.getNext())}. Items(${player.getItemCount()}): ${items.join(" ")}`);
      })
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
      return context.reply("Commands not currently implemented");
  }
};

module.exports = Command;