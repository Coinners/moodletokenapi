import express from 'express'
import bodyParser from 'body-parser'
import loki from 'lokijs'
import { v4 as uuidv4 } from 'uuid'
import got, { MaxRedirectsError } from 'got'
import fs from 'fs'
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from 'toad-scheduler'
import {CookieJar} from 'tough-cookie'

const port = 3000 //the port the server's hosted on
const adminkey = 'ZL0j7LniNCwqmR13WlwO' //Random 20 character string
const randomfreq = 10 //in sec
const refreshtime = 4 //in sec
const cleardatabase = true //clears whole database after server start ONLY USEFUL FOR DEVELOPMENT

//TODO Use better argument capture method by express
//TODO Outsource helper methods
//TODO Maybe return dict instead of array
//TODO Handle moodle not available

initialize()
const scheduler = new ToadScheduler()
var db = new loki('tokens.db', { autoload: true, autosave: true, autoloadCallback: databaseInitialized })
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
  schoolClass.tokens.forEach(element => {
    scheduler.removeById(element.id)
  })
  classes.remove(schoolClass)
  res.status(200).send({'error-code':200,'error-message':'OK','data':[]})
})

app.post('/*/add', async (req, res) => { //Add option for adding by password + username
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
  } //TODO get token expiration directly on token check
  var moodle = await got.get(schoolClass.url,{headers: {Cookie: 'MoodleSession='+token}}).catch((requestError)=>{
    if (requestError instanceof MaxRedirectsError)
    {
      res.status(400).send({'error-code':400,'error-message':'Invalid token','data':[]})
    }
    else
    {
      res.status(410).send({'error-code':410,'error-message':'Can\'t reach moodle server','data':[]})
    }
    error = true
  })
  if (error)
  { return }
  if (moodle.statusCode !== 200)
  {
    res.status(400).send({'error-code':400,'error-message':'Invalid token','data':[]})
    return
  }
  var name = req.body.name //TODO fetch name automatically
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
  res.status(200).send({'error-code':200,'error-message':'OK','data':[removeProperties(schoolClass,'meta','$loki')]})
})

function initialize() {
  console.log('Initializing')
  if (cleardatabase)
  {
    fs.unlink('./tokens.db', ()=>{})
  }
  fs.writeFile('./tokens.db', '', { flag: 'a' }, (err) => {
    if (err) throw err
  })
}

function databaseInitialized() {
  console.log('Database loaded')
  if (cleardatabase) {
    db.addCollection('classes')
    db.addCollection('backup')
    db.saveDatabase()
  }
  classes = db.getCollection('classes')
  backup = db.getCollection('backup')
  if (!cleardatabase) {
    classes.data.forEach(schoolClass => {
      schoolClass.tokens.forEach(async token => {
        var task = new AsyncTask(token.id, refreshToken(token.token, token.userid))
        var job = new SimpleIntervalJob({seconds: await getTimeleft(token.token, token.sessionkey)-refreshtime}, task)
        scheduler.addSimpleIntervalJob(job)
      })
    })
  }
  app.listen(port, () => {
    console.log(`Server online at http://localhost:${port}`)
  })
}

async function getTimeleft(token, sessionkey) {
  var timeleft = await client.post('https://moodle.rbs-ulm.de/moodle/lib/ajax/service.php?sesskey='+sessionkey+'&info=core_session_time_remaining&nosessionupdate=true', {json:[{"index":0,"methodname":"core_session_time_remaining","args":{}}], headers:{Cookie:'MoodleSession='+token}}).json()
  timeleft = timeleft[0]['data']['timeremaining']
  return timeleft
}

async function refreshToken(token, userid) {
  await client.get('https://moodle.rbs-ulm.de/moodle/login/index.php?testsession='+userid,{headers:{Cookie:'MoodleSession='+token}})
}

async function addUserbyAccount(username, password, url) { //TODO user auth through email + password
  const cookieJar = new CookieJar()
  const client = got.extend({ cookieJar })
  var login = await client.get(url+'blocks/exa2fa/login/')
  var logintoken = login.body.match(/(?<="logintoken" value=")\w{32}/)[0]
  var userid = (await client.post(url+'blocks/exa2fa/login/',{form:{ajax: true,anchor:'',logintoken:logintoken,username:username,password:password,token:''}}).text()).match(/(?<=testsession=).*?(?=","original)/)[0]
  await client.get(url+'login/index.php?testsession='+userid)
  var token = (await cookieJar.getCookies('https://moodle.rbs-ulm.de'))[0].toJSON()['value']
  return token
}

function removeProperties(element, ...props) {
  props.forEach(prop => delete element[prop])
  return element
}