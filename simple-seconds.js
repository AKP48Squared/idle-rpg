function days(d) {
  return hours(24) * d;
}
function hours(h) {
  return minutes(60) * h;
}
function minutes(m) {
  return 60 * m;
}
function millis(millis) {
  return Math.floor(millis / 1000);
}
function now() {
  return millis(Date.now());
}
exports.inDays = days;
exports.inHours = hours;
exports.inMinutes = minutes;
exports.fromMillis = millis;
exports.time = now;
// Convenience values
exports.oneDay = days(1);
exports.oneHour = hours(1);
exports.oneMinute = minutes(1);