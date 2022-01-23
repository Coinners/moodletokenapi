import express from 'express'
import bodyParser from 'body-parser'
import loki from 'lokijs'
import { v4 as uuidv4 } from 'uuid'
import got from 'got'
import fs from 'fs'
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from 'toad-scheduler'
import { CookieJar } from 'tough-cookie'

const port = 3000
const adminkey = 'ZL0j7LniNCwqmR13WlwO'
const randomfreq = 10
const refreshtime = 3
var cleardatabase = false

//TODO Handle moodle not available [Future]
//TODO Implement rate limits [Future]
//TODO Implement random searching for tokens [Future]
//TODO Fix linux server path handling

initialize()
const scheduler = new ToadScheduler()
var db = new loki('./tokens.db', { autoload: true, autosave: true, autoloadCallback: databaseInitialized })
const serverversion = 1
const app = express()
var classes = null
var backup = null
app.use(bodyParser.json({ extended: true }))

app.post('/add', async (req, res) => {
  if (req.body.key !== adminkey)
  {
    res.status(400).send({'error-code':400,'error-message':'Invalid adminkey','data':{}})
    return
  }
  var name = req.body.name
  var url = req.body.url.match(/http.+\/moodle/)[0]+'/' //TODO Change matching pattern to make request for validation
  if (url === null)
  {
    res.status(400).send({'error-code':400,'error-message':'Invalid url','data':{}})
    return
  }
  var moodle = await got.get(url).text()
  if (moodle.match('moodle') === null)
  {
    res.status(400).send({'error-code':400,'error-message':'Invalid website','data':{}})
    return
  }
  var id = uuidv4()
  classes.insert({'name': name, 'url': url, 'id': id, 'tokens':[]})
  res.status(200).send({'error-code':200,'error-message':'OK','data':{'name': name, 'url': url, 'id': id}})
})

app.post('/remove/:class', (req, res) => {
  if (req.body.key !== adminkey)
  {
    res.status(400).send({'error-code':400,'error-message':'Invalid adminkey','data':{}})
    return
  }
  var schoolClass = classes.findOne({'id':req.params.class})
  if (schoolClass === null)
  {
    res.status(400).send({'error-code':404,'error-message':'Could not find class','data':{}})
    return
  }
  schoolClass.tokens.forEach(user => {
    scheduler.removeById(user.id)
  })
  classes.remove(schoolClass)
  res.status(200).send({'error-code':200,'error-message':'OK','data':{}})
})

app.post('/:class/add', async (req, res) => {
  var error = false
  var userid = null
  var sessionkey = null
  var schoolClass = classes.findOne({'id':req.params.class})
  if (schoolClass === null)
  {
    res.status(404).send({'error-code':404,'error-message':'Not found','data':{}})
    return
  }
  var token = req.body.token
  if (req.body.password != null) {
    try {[token, userid, sessionkey] = await getTokenbyCredentials(req.body.name, req.body.password, schoolClass.url)}
    catch (e) {
      res.status(400).send({'error-code':400,'error-message':'Wrong Credentials','data':{}})
      error = true
      next(e)
    }
  }
  if (error) {return}
  schoolClass.tokens.forEach(element => { //TODO Implement preventation of double token through password add
    if (element.token === token)
    {
      res.status(400).send({'error-code':400,'error-message':'Token already exists','data':{}})
      error = true
      return
    }
  })
  if (error) {return}
  if (req.body.password == null)
  {
    var moodle = await got.get(schoolClass.url,{headers: {Cookie: 'MoodleSession='+token}}).catch(()=>{})
    if (moodle.statusCode != 200)
    {
      res.status(400).send({'error-code':400,'error-message':'Invalid token','data':{}})
      return
    }
    userid = moodle.body.match(/(?<=php\?userid=)\d+/)[0]
    sessionkey = moodle.body.match(/(?<=sesskey=)\w{10}/)[0]
  }
  var user = { name: req.body.name,time: Date.now(),userid: userid,id: uuidv4(),token: token,sessionkey: sessionkey }
  addUsertoClass(user,schoolClass)
  res.status(200).send({'error-code':200,'error-message':'OK','data':user})
})

app.get('/', (req, res) => {
  res.status(200).send({'error-code':200,'error-message':'OK','data':{'serverversion':serverversion}})
})

app.get('/:class', (req, res) => {
  var schoolClass = classes.findOne({'id':req.params.class})
  if (schoolClass === null)
  {
    res.status(404).send({'error-code':404,'error-message':'Not found','data':{}})
    return
  }
  res.status(200).send({'error-code':200,'error-message':'OK','data':removeLokiProperties(schoolClass)})
})

app.all('/*', (req, res) => {
  res.status(404).send({'error-code':404,'error-message':`Can't use ${req.method} on ${req.path}`,'data':{}})
})

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(err)
  }
  console.log('Path: ', req.path)
  console.error('Error: ', error)
  res.status(500).send({'error-code':500,'error-message':'Something went wrong on our end','data':{}})
})

function initialize() {
  console.log('Initializing')
  if (cleardatabase)
  {
    fs.unlink('./tokens.db', ()=>{})
  }
  fs.writeFile('./tokens.db', '', { flag: 'wx' }, (err) => {
    if (err) {
      if (err.code !== 'EEXIST') {
        {throw err}
      }
    }
    else {
      cleardatabase = true
    }
  })
}

function databaseInitialized() {
  console.log('Database loaded')
  if (cleardatabase) {
    classes = db.addCollection('classes')
    backup = db.addCollection('backup')
    db.saveDatabase()
  }
  else {
    classes = db.getCollection('classes')
    backup = db.getCollection('backup')
  }
  classes?.data.forEach(schoolClass => {
    schoolClass.tokens.forEach(user => {
      addUsertoTask(user)
    })
  })
  app.listen(port, () => {
    console.log(`Server online at http://localhost:${port}`)
  })
}

async function getTimeleft(user) {
  var timeleft = await got.post('https://moodle.rbs-ulm.de/moodle/lib/ajax/service.php?sesskey='+user.sessionkey+'&info=core_session_time_remaining&nosessionupdate=true', {json:[{"index":0,"methodname":"core_session_time_remaining","args":{}}], headers:{Cookie:'MoodleSession='+user.token}}).json()
  timeleft = timeleft[0]['data']['timeremaining']
  return timeleft
}

async function refreshToken(user) {
  await got.get('https://moodle.rbs-ulm.de/moodle/login/index.php?testsession='+user.userid,{headers:{Cookie:'MoodleSession='+user.token}})
}

async function addUsertoTask(user) {
  console.log('add user to task:')
  console.log(user)
  var task = new AsyncTask(user.id, async ()=>{await refreshToken(user)}, (e)=>{
    scheduler.removeById(user.id) 
    console.error(e)
  })
  refreshToken(user).catch((e)=>{console.error(e)})
  var job = new SimpleIntervalJob({seconds: await getTimeleft(user)-refreshtime}, task)
  scheduler.addSimpleIntervalJob(job)
}

function addUsertoClass(user, schoolClass) {
  schoolClass['tokens'].push({'name':user.name,'time':user.time,'token':user.token,'userid':user.userid,'id':user.id,'sessionkey':user.sessionkey})
  classes.update(schoolClass)
  backup.insert({token:user.token})
  addUsertoTask(user)
}

async function getTokenbyCredentials(username, password, url) {
  const cookieJar = new CookieJar()
  const client = got.extend({cookieJar})
  var login = await client.get(url+'blocks/exa2fa/login/')
  var logintoken = login.body.match(/(?<="logintoken" value=")\w{32}/)[0]
  var userid = (await client.post(url+'blocks/exa2fa/login/',{form:{ajax: true,anchor:'',logintoken:logintoken,username:username,password:password,token:''}}).text()).match(/(?<=testsession=).*?(?=","original)/)[0]
  var sessionkey = (await client.get(url).text()).match(/(?<=sesskey=)\w{10}/)[0]
  var token = (await cookieJar.getCookies('https://moodle.rbs-ulm.de'))[0].toJSON()['value']
  return [token, userid, sessionkey]
}

function removeLokiProperties(element) {
  const { $loki, meta, ...removed } = element
  return removed
}