const join = require("../msi/join");
const login = require("../msi/login");
const util = require("../utilities");

// Player management
function Command() {
  this.names = ["join", "login", "register", "part", "logout", "quit", "pass", "info"];
  this.perms = [];
}

Command.prototype.process = function(context) {
  var args = context.irpgText.split(" "), uid = `${context.instanceId}_${context.nick}`;
  switch (context.irpgCommand.toLowerCase()) {
    case "register":
    case "join":
      return join.start(context);
    case "login":
      return login.start(context);
      /*if (args.length < 2) return context.reply(`Incorrect syntax: ${context.irpgCommand} <name> <password> [class]`);
      if (!context.isPM) context.reply("Uh... you just showed everyone your password!");
      // Check that you're not logged in already
      if (context.player) return context.reply(`You're already logged in as ${context.player.getName()}`);
      // Ensure user is in a game channel
      if (!context.irpg.isInChannel(context.name)) return context.reply("Sorry, you aren't in an IdleRPG participating channel.");
      // Check if the player is already loaded TODO: allow multiple logins
      if (context.irpg.playerLoaded(args[0])) return context.reply("Sorry, this player is already logged in");
      // If not, load it
      context.irpg.getPlayer(args[0], function (player) {
        if (player === false) return context.alert("An error occurred when looking up players");
        var isNew = false;
        if (!player) {
          if (args.length < 3) return context.reply(`To create a player you must include a class name.`);
          player = context.irpg.getNewPlayer(args[0], args[1], args[2]);
          context.reply(`Welcome to IdleRPG, ${args[0]}! Keep in mind that this is an idle game, and that talking (in channels playing the game), changing nicks, parting, and quitting will penalize you.`);
          context.irpg.sendMessages(`Here's a warm welcome to our newest player ${args[0]} the ${args[2]}! Next level in ${util.duration(player.getNext())}`, "join");
          isNew = true;
        } else { // Login
          if (!player.isPassword(args[1])) return context.reply("Invalid password"); // TODO: Prevent brute force
          // TODO: make sure they've joined a channel playing the game
          context.reply("You have logged in");
          context.irpg.sendMessages(`${player.getName()} the level ${player.getLevel()} ${player.getClass()} is now online. Next level in ${util.duration(player.getNext())}`, "login");
        }
        context.irpg.loginPlayer(player, uid, isNew);
      });
      break;*/
    case "logout":
    case "part":
      // Check if you're logged in already
      var player = context.player;
      if (!player) return context.reply("You aren't logged in");
      var p = player.penalize(20);
      player.logout(uid);
      context.reply(`You have been penalized ${util.duration(p)} for logging out.`);
      // TODO: message all remaining users
      break;
    case "pass":
      // Check if you're logged in already
      var player = context.player;
      if (!player) return context.reply("You aren't logged in");
      if (args.length < 1) return context.reply("You must provide a new password");
      player.setPassword(args[0]);
      context.reply("Password changed");
      // TODO: message all users
      break;
    case "info":
      var player = context.player;
      if (!player) return context.reply("You aren't logged in");
      return context.reply(player.toString());
    case "quit":
      // Check if you're logged in already
      var player = context.player;
      if (!player) return context.reply("You aren't logged in");
      context.reply("Quitting is not implemented");
      break;
  }
};

module.exports = Command;