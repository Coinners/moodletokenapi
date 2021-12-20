import express from 'express'
import bodyParser from 'body-parser'
import loki from 'lokijs'
import { v4 as uuidv4 } from 'uuid'
import got from 'got'
import fs from 'fs'

const port = 3000
const adminkey = 'ZL0j7LniNCwqmR13WlwO'
const tokenfreq = 60 //in sec
const randomfreq = 10 //in sec
const cleardatabase = false //clears whole database after server start ONLY USEFUL FOR DEVELOPMENT

initialize()
var db = new loki('tokens.db', {autoload: true, autosave: true, autoloadCallback: databaseInitialize})
const app = express()
app.use(bodyParser.json({ extended: true }))

app.post('/add', async (req, res) => {
  if (req.body.key !== adminkey)
  {
    //Errorhandling
    return
  }
  var name = req.body.name.toString()
  var url = req.body.url.toString().match(/http.+(?=\/moodle)/)
  if (url === null || await got.get(url).text.match(/content="moodle/) === null)
  {
    //Errorhandling
    return
  }
  db.getCollection('tokens').add({'name': name, 'url': url, 'id': uuidv4(), 'tokens':[]})
  res.send(id)
})

app.post('/remove/*', (req, res) => {
  if (req.body.key !== adminkey)
  {
    //Errorhandling
    return
  }
})

app.post('/*/add', (req, res) => {

})

app.get('/*', (req, res) => {
  var collection = db.getCollection(req.path.replaceAll('/','')) //Partially right
})

function initialize() {
  if (cleardatabase)
  {
    fs.unlink('./tokens.db', (err) => {
      if (err) throw err
    })
  }
  fs.writeFile('./tokens.db', '', { flag: 'a' }, function (err) {
    if (err) throw err
  })
}

function databaseInitialize() {
  if (cleardatabase) {
    db.addCollection('tokens')
    db.saveDatabase()
  }
  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
    Promise.all([checkTokens(),findRandoms()])
  })
}

function checkTokens() {
  return new Promise(async function(resolve, reject) {
    while (true) {
      await new Promise(r => setTimeout(r, tokenfreq*1000))
      console.log('Token Check')
    }
  })
}

function findRandoms() {
  return new Promise(async function(resolve, reject) {
    while (true) {
      await new Promise(r => setTimeout(r, randomfreq*1000))
      console.log('Random Find')
    }
  })
}

async function findTokenbyUser(username, password, url) {
  await got.post(url, {
    json: {
      ajax: true,
      anchor: null,
      logintoken: null,
      username: username,
      password: password,
      token: null
    }
  })
}