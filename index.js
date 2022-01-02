import express from 'express'
import bodyParser from 'body-parser'
import loki from 'lokijs'
import { v4 as uuidv4 } from 'uuid'
import got, { MaxRedirectsError } from 'got'
import fs from 'fs'
import schedule from 'node-schedule'

const port = 3000 //the port the server's hosted on
const adminkey = 'ZL0j7LniNCwqmR13WlwO' //Random 20 character string
const randomfreq = 10 //in sec
const refreshtime = 5
const cleardatabase = true //clears whole database after server start ONLY USEFUL FOR DEVELOPMENT

//TODO Implement token refresh
//TODO Fetch Name automatically + get token expiration directly on token check
//TODO Outsource helper methods
//TODO Maybe return dict instead of array

initialize()
var db = new loki('tokens.db', { autoload: true, autosave: true, autoloadCallback: databaseInitialize })
const serverversion = 1
const app = express()
var classes
var backup
app.use(bodyParser.json({ extended: true }))

app.post('/add', async (req, res) => {
  if (req.body.key !== adminkey)
  {
    res.status(400).send({'error-code':400,'error-message':'Invalid adminkey','data':[]})
    return
  }
  var name = req.body.name
  var url = req.body.url.match(/http.+\/(?=moodle)/)[0]
  if (url === null)
  {
    res.status(400).send({'error-code':400,'error-message':'Invalid url','data':[]})
    return
  }
  var moodle = await got.get(url).text()
  if (moodle.match('moodle') === null)
  {
    res.status(400).send({'error-code':400,'error-message':'Invalid website','data':[]})
    return
  }
  var id = uuidv4()
  classes.insert({'name': name, 'url': url, 'id': id, 'tokens':[]})
  res.status(200).send({'error-code':200,'error-message':'OK','data':[{'name': name, 'url': url, 'id': id}]})
})

app.post('/remove/*', (req, res) => {
  if (req.body.key !== adminkey)
  {
    res.status(400).send({'error-code':400,'error-message':'Invalid adminkey','data':[]})
    return
  }
  var schoolClass = classes.findOne({'id':req.path.replaceAll(/\/|remove/g,'')})
  if (schoolClass === null)
  {
    res.status(400).send({'error-code':404,'error-message':'Could not find class','data':[]})
    return
  }
  classes.remove(schoolClass)
  res.status(200).send({'error-code':200,'error-message':'OK','data':[]})
})

app.post('/*/add', async (req, res) => {
  var error = false
  var schoolClass = classes.findOne({'id':req.path.replaceAll(/\/|add/g,'')})
  if (schoolClass === null)
  {
    res.status(404).send({'error-code':404,'error-message':'Not found','data':[]})
    return
  }
  var token = req.body.token
  schoolClass.tokens.forEach(element => {
    if (element.token === token)
    {
      error = true
      return
    }
  })
  if (error)
  {
    res.status(400).send({'error-code':400,'error-message':'Token already exists','data':[]})
    return
  }
  var moodle = await got.get(schoolClass.url,{headers: {Cookie: 'MoodleSession='+token}}).catch((requestError)=>{
    if (requestError instanceof MaxRedirectsError)
    {
      res.status(400).send({'error-code':400,'error-message':'Invalid token','data':[]})
      error = true
    }
    else
    {
      res.status(410).send({'error-code':410,'error-message':'Can\'t reach moodle server','data':[]})
      error = true
    }
  })
  if (error)
  { return }
  if (moodle.statusCode !== 200)
  {
    res.status(400).send({'error-code':400,'error-message':'Invalid token','data':[]})
    return
  }
  var name = req.body.name
  var time = Date.now()
  var userid = moodle.body.match(/(?<=php\?userid=)\d+/)[0]
  var id = uuidv4()
  schoolClass['tokens'].push({'name':name,'time':time,'token':token,'userid':userid,'id':id})
  classes.update(schoolClass)
  backup.insert(token)
  res.status(200).send({'error-code':200,'error-message':'OK','data':[{'name':name,'time':time,'token':token,'userid':userid,'id':id}]})
})

app.get('/', (req, res) => {
  res.status(200).send({'error-code':200,'error-message':'OK','data':[{'serverversion':serverversion}]})
})

app.get('/*', (req, res) => {
  var schoolClass = classes.findOne({'id':req.path.replaceAll('/','')})
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
    fs.unlink('./tokens.db', ()=>{})
  }
  fs.writeFile('./tokens.db', '', { flag: 'a' }, (err) => {
    if (err) throw err
  })
}

function databaseInitialize() {
  if (cleardatabase) {
    db.addCollection('classes')
    db.addCollection('backup')
    db.saveDatabase()
  }
  classes = db.getCollection('classes')
  backup = db.getCollection('backup')
  app.listen(port, () => {
    console.log(`Token server listening at http://localhost:${port}`)
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