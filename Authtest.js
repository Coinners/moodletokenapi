import got from 'got'
import {CookieJar} from 'tough-cookie'
import tokens from './tokens.json'

tokens.forEach(async token => {
  var account = await addUserbyAccount(token.username, token.password, 'https://moodle.rbs-ulm.de/moodle/')
  console.log(account)
})

async function addUserbyAccount(username, password, url) {
    const cookieJar = new CookieJar()
    const client = got.extend({ cookieJar })
    var login = await client.get(url+'blocks/exa2fa/login/')
    var logintoken = login.body.match(/(?<="logintoken" value=")\w{32}/)[0]
    var userid = (await client.post(url+'blocks/exa2fa/login/',{form:{ajax: true,anchor:'',logintoken:logintoken,username:username,password:password,token:''}}).text()).match(/(?<=testsession=).*?(?=","original)/)[0]
    await client.get(url+'login/index.php?testsession='+userid)
    var token = (await cookieJar.getCookies('https://moodle.rbs-ulm.de'))[0].toJSON()['value']
    return token
  }