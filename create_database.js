const loki = require("lokijs")
var db = new loki("tokens.db")
var tokens = db.addCollection("tokens")
tokens.insert({
    name: "Person",
    time: 478392142573,
    token: "trjkeihjtelrlkerhjlkerhnel"
})
db.saveDatabase(function(err) {
    if (err) {
      console.log(err);
    }
    else {
      console.log("database saved");
    }
})