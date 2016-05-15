'use strict';
const MSI = require("./msi");

class JoinMSI extends MSI {
  constructor() {
    super(join);
  }
}

function join(step, context) {
  var data = this.getData(), text = typeof context.irpgText !== "undefined" ? context.irpgText : context.text, self = this, game = context.irpg;
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
            return context.reply("What's your player's name?");
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
        context.reply(`Password: ${text} <yes/no>`);
      }
      return false;
    case 2: // Class
      if (data) { // Confirm input
        if (!text) return context.reply(`Use class: '${data}'? <yes|no>`);
        switch (text.toLowerCase()) {
          default:
            return context.reply("Invalid response. <yes|no> expected");
          case "yes":
          case "y":
            // TODO: create username
           return true;
          case "no":
          case "n":
            this.remove()
            return context.reply("What's your class? (Exit with 'QUIT')");
        }
      } else if (!text) { // Reply input class
        context.reply(`Input class for player (${game.getConfig().maxClassLength} characters max)`);
      } else { // Validate class
        if (text.length <= game.getConfig().maxClassLength) {
          this.store(text);
          return true;
        }
      }
      return false;
  }
}

module.exports = new JoinMSI();