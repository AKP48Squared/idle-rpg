'use strict';
const MSI = require("./msi");

class LoginMSI extends MSI {
  constructor() {
    super(function (step, context) {
      var game = context.irpg, data = this.getData(), text = typeof context.irpgText !== "undefined" ? context.irpgText : context.text, self = this;
      if (text === "QUIT") return this.finish();
      // Return TRUE if the step is finished
      switch(step) {
        case 0: // Name
          if (text) {
            if (game.playerLoaded(text)) { // Is player already loaded?
              // TODO: Allow multi-logins
              context.reply("Sorry, this player is already logged in");
              return this.finish();
            } else { // Load player from database
              self.pending = true;
              game.getPlayer(text, function (player) {
                if (!player) {
                  self.finish(); // End the sequence
                  return context.reply("Player does not exist. Register with 'idle join'");
                }
                self.pending = false;
                self.store(text);
                self.stage++;
                // Manually call the next sequence
                self.run(context);
              });
            }
          } else { // Prompt for name
            context.reply("Enter player name");
          }
          return false;
        case 1: // Password
          if (!text) return context.reply("Enter password");
          if (data && data >= 3) {
            context.reply("Too many failed attempts, aborting");
            return this.finish();
          }
          self.pending = true;
          game.getPlayer(this.getLast(), function (player) {
            self.pending = false;
            if (!player) return; // Player not found, or database error
            if (!player.isPassword(text)) {
              self.store(data ? data++ : 1);
              context.reply("Incorrect password");
              self.run(context);
            } else {
              context.reply("You have logged in. Next level in " + util.duration(player.getNext()));
              game.sendMessages(`${player.getName()} the level ${player.getLevel()} ${player.getClass()} is now online. Next level in ${util.duration(player.getNext())}`, "login");
              self.finish();
            }
          });
          return false;
      }
    });
  }
}

module.exports = new LoginMSI();