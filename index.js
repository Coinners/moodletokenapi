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
const cleardatabase = true //clears whole database after server start ONLY USEFUL FOR DEVELOPMENT
const serverversion = 1 //DONT CHANGE THIS
//make const classes instance

initialize()
var db = new loki('tokens.db', { autoload: true, autosave: true, autoloadCallback: databaseInitialize })
const app = express()
app.use(bodyParser.json({ extended: true }))

app.post('/add', async (req, res) => {
  if (req.body.key.toString() !== adminkey)
  {
    res.status(400).send({'error-code':400,'error-message':'Invalid adminkey','data':[]})
    return
  }
  var name = req.body.name.toString()
  var url = req.body.url.toString().match(/http.+\/(?=moodle)/)
  if (url === null)
  {
    res.status(400).send({'error-code':400,'error-message':'Invalid url','data':[]})
    return
  }
  var moodle = await got.get(url[0]).text()
  if (moodle.match(/content='moodle/) === null)
  {
    res.status(400).send({'error-code':400,'error-message':'Invalid website','data':[]})
    return
  }
  var id = uuidv4()
  db.getCollection('classes').insert({'name': name, 'url': url[0], 'id': id, 'tokens':[]})
  res.status(200).send({'error-code':200,'error-message':'OK','data':[{'name': name, 'url': url[0], 'id': id}]})
})

app.post('/remove/*', (req, res) => {
  if (req.body.key !== adminkey)
  {
    res.status(400).send({'error-code':400,'error-message':'Invalid adminkey','data':[]})
    return
  }
  res.status(200).send({'error-code':200,'error-message':'OK','data':[]})
})

app.post('/*/add', (req, res) => {
  res.status(200).send({'error-code':200,'error-message':'OK','data':[]})
})

app.get('/', (req, res) => {
  res.status(200).send({'error-code':200,'error-message':'OK','data':[{'serverversion':serverversion}]})
})

app.get('/*', (req, res) => {
  var schoolClass = db.getCollection('classes').findOne({'id':req.path.replaceAll('/','')})
  if (schoolClass === null)
  {
    res.status(404).send({'error-code':404,'error-message':'Not found','data':[]})
    return
  }
  res.status(200).send({'error-code':200,'error-message':'OK','data':[schoolClass]})
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
    db.addCollection('classes')
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
      //Logic
    }
  })
}

function findRandoms() {
  return new Promise(async function(resolve, reject) {
    while (true) {
      await new Promise(r => setTimeout(r, randomfreq*1000))
      //Logic
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
