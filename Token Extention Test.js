import {promisify} from 'util'
import got from 'got'
import {CookieJar} from 'tough-cookie'
import schedule from 'node-schedule'

schedule.scheduleJob('*/5 * * * *', async ()=>{
    console.log('lol')
})
const sessiontoken = 'e2l3dtkdue566qcvkptjhh68nj' //orig: fvdi07rkq5miv3vmc1p8j7llq3 other: 6mhol5qo7despjaj9hq3srtuv0
const cookieJar = new CookieJar()
const setCookie = promisify(cookieJar.setCookie.bind(cookieJar))

await setCookie('MoodleSession='+sessiontoken,'https://moodle.rbs-ulm.de')
var client = got.extend({ cookieJar })

var login = await client.get('https://moodle.rbs-ulm.de/moodle/').text()
var userid = login.match(/(?<=php\?userid=)\d+/)[0]
var sessionkey = login.match(/(?<=sesskey=)\w{10}/)[0]
var username = login.match(/(?<=class="usertext mr-1">).*?(?=\<\/span)/)[0]
console.log('time='+Date.now()+'\nsessionkey='+sessionkey+'\nuserid='+userid+'\nusername='+username)
while (true) {
    var timeleft = await client.post('https://moodle.rbs-ulm.de/moodle/lib/ajax/service.php?sesskey='+sessionkey+'&info=core_session_time_remaining&nosessionupdate=true',{json:[{"index":0,"methodname":"core_session_time_remaining","args":{}}]}).json()
    timeleft = timeleft[0]['data']['timeremaining']
    await new Promise(r => setTimeout(r, (timeleft-2)*1000));
    var req = await client.get('https://moodle.rbs-ulm.de/moodle/login/index.php?testsession='+userid)
    //var req = await client.get('https://moodle.rbs-ulm.de/moodle/')
    //var req = await client.post('https://moodle.rbs-ulm.de/moodle/lib/ajax/service.php?sesskey='+sessionkey+'&info=core_session_touch',{json:[{"index":0,"methodname":"core_session_touch","args":{}}]})
    console.log(Date.now())
    console.log(req.statusCode)
    console.log(cookieJar.getCookies('https://moodle.rbs-ulm.de'))
}