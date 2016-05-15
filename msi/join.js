'use strict';
const MSI = require("./msi");
const util = require("../utilities");

class JoinMSI extends MSI {
  constructor() {
    super(join);
  }
}

function join(step, context) {
  var data = this.getData(), text = typeof context.irpgText !== "undefined" ? context.irpgText : context.text, self = this, game = context.irpg, user = `${context.instanceId}_${context.nick}`;
  if (!game.isInChannel(user)) {
    context.reply("Sorry, you aren't in a game channel. Please join a channel that is running IdleRPG then try again.");
    return this.finish();
  }
  if (context.text === "QUIT") return this.finish();
  // Return TRUE if the step is finished
  switch(step) {
    case 0: // Name
      if (data) { // Confirm input
        if (!text) return context.reply(`Create player with name: '${data}'? <yes|no>`);
        switch (text.toLowerCase()) {
          default: return context.reply("Invalid response. <yes|no> expected");
          case "yes":
          case "y":
            return true;
          case "no":
          case "n":
            this.remove();
            return context.reply(`What name should we use? (${game.getConfig().maxNameLength} characters max) (Exit with 'QUIT')`);
        }
      } else if (!text) { // Reply input name
        context.reply(`Creating player, what name should we use? (${game.getConfig().maxNameLength} characters max)`);
      } else { // Validate name
        if (text.length > game.getConfig().maxNameLength) {
          context.reply(`'${text}' is too long`);
          return "retry";
        }
        // Make sure the player doesn't exist already
        self.pending = true;
        game.getPlayer(text, function (player) {
          self.pending = false;
          if (player) { // Player already exists
            context.reply("Player already exists. To login use 'idle login' (Exit first with 'QUIT')");
          } else {
            self.store(text);
          }
          // Manually call the next sequence
          self.run(context);
        });
      }
      return false;
    case 1: // Password
      if (data) { // Confirm input
        if (!text) return context.reply(`Use password: '${data}'? <yes|no>`);
        switch (text.toLowerCase()) {
          default:
            return context.reply("Invalid response. <yes|no> expected");
          case "yes":
          case "y":
             return true;
          case "no":
          case "n":
            this.remove()
            return context.reply("What's your password? (Exit with 'QUIT')");
        }
      } else if (!text) { // Reply input pass
        context.reply("Input password for player");
      } else { // Validate pass
        if (!context.isPM) context.reply("Uh... you just showed everyone your password!");
        this.store(text);
        return "confirm";
      }
      return false;
    case 2: // Class
      if (data) { // Confirm input
        if (!text) return context.reply(`Use class: '${data}'? <yes|no>`);
        switch (text.toLowerCase()) {
          default:
            return context.reply("Invalid response. <yes|no> expected");
          case "yes":
          case "y"
            var player = game.getNewPlayer(this.getData(0), this.getData(1), data);
            context.reply(`Welcome to IdleRPG, ${player.getName()}! Keep in mind that this is an idle game, and that talking (in channels playing the game), changing nicks, parting, and quitting will penalize you.`);
            game.sendMessages(`Here's a warm welcome to our newest player ${player.getName()} the ${player.getClass()}! Next level in ${util.duration(player.getNext())}`, "join");
            game.loginPlayer(player, user);
            return this.end();
          case "no":
          case "n":
            this.remove();
            return context.reply(`What class do you want? (${game.getConfig().maxClassLength} characters max) (Exit with 'QUIT')`);
        }
      } else if (text) {
        if (text.length > game.getConfig().maxClassLength) {
          context.reply(`'${text}' is too long`);
          return "retry";
        }
        this.store(text);
        return "confirm";
      }
      // Reply input class
      return context.reply(`Input class for player (${game.getConfig().maxClassLength} characters max)`);
  }
}

module.exports = new JoinMSI();