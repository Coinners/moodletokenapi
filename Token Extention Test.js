import {promisify} from 'util'
import got from 'got'
import {CookieJar} from 'tough-cookie'

const sessiontoken = '8a76vmeqvpl1ihhhf92uqm24b8'
const cookieJar = new CookieJar();
const setCookie = promisify(cookieJar.setCookie.bind(cookieJar));

await setCookie('MoodleSession='+sessiontoken,'https://moodle.rbs-ulm.de')
var client = got.extend({ cookieJar })

var login = await client.get('https://moodle.rbs-ulm.de/moodle/').text()
var userid = login.match(/(?<=php\?userid=)\d+/)[0]
var sessionkey = login.match(/(?<=sesskey=)\w{10}/)[0]
while (true) {
    await new Promise(r => setTimeout(r, 60*1000));
    var req = await client.get('https://moodle.rbs-ulm.de/moodle/login/index.php?testsession='+userid)
    console.log(req.statusCode)
    console.log(cookieJar.getCookies('https://moodle.rbs-ulm.de'))
}