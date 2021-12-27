import {promisify} from 'util'
import got from 'got'
import {CookieJar} from 'tough-cookie'

const sessiontoken = '8a76vmeqvpl1ihhhf92uqm24b8'
const cookieJar = new CookieJar()
const setCookie = promisify(cookieJar.setCookie.bind(cookieJar))

await setCookie('MoodleSession='+sessiontoken,'https://moodle.rbs-ulm.de')
var client = got.extend({ cookieJar })

var login = await client.get('https://moodle.rbs-ulm.de/moodle/').text()
var userid = login.match(/(?<=php\?userid=)\d+/)[0]
var sessionkey = login.match(/(?<=sesskey=)\w{10}/)[0]
var username = login.match(/(?<=class="usertext mr-1">).*?(?=\<\/span)/)[0]
console.log('sessionkey='+sessionkey+'\nuserid='+userid+'\nusername='+username)
while (true) {
    await new Promise(r => setTimeout(r, 60*1000));
    //var req = await client.get('https://moodle.rbs-ulm.de/moodle/login/index.php?testsession='+userid)
    //var req = await client.get('https://moodle.rbs-ulm.de/moodle/')
    var req = await client.post('https://moodle.rbs-ulm.de/moodle/lib/ajax/service.php?sesskey='+sessionkey+'&info=core_session_touch',{json:[{"index":0,"methodname":"core_session_touch","args":{}}]})
    console.log(req.statusCode)
    console.log(cookieJar.getCookies('https://moodle.rbs-ulm.de'))
}