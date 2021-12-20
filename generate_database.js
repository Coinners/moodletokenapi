const loki = require("lokijs")
const { v4: uuidv4 } = require('uuid');
var db = new loki("tokens.db")
var tokens = db.addCollection(uuidv4())
db.saveDatabase(function(err) {
    if (err) {
      console.log(err);
    }
    else {
      console.log("database saved");
    }
})