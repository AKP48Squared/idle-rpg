function Command() {
  this.names = ["top"];
  this.perms = [];
}

Command.prototype.process = function(context) {
  // Display top 3 player info
  context.irpg.getTopPlayers(function (players) {
    var msgs = ["Top Players:"];
    var i = 0;
    players.forEach(function (player) {
      i++;
      var name = player.getName(),
        clazz = player.getClass(),
        level = player.getLevel();
      msgs.push(`#${i}: ${name}, the level ${level} ${clazz}!`);
    });
    if (i === 0) msgs.push("No players found!"); // return;
    msgs.forEach(msg => context.reply(msg));
  });
};


module.exports = Command;