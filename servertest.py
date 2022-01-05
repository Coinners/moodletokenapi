import requests

adminkey = "ZL0j7LniNCwqmR13WlwO"

schoolClass = requests.post('http://localhost:3000/add',json={"key":adminkey,"name":"6TG10/1 Ulm","url":"https://moodle.rbs-ulm.de/moodle/mod/forum/view.php?id=21033"})
print(schoolClass.text)
addUser = requests.post('http://localhost:3000/'+schoolClass.json()['data']['id']+'/add',json={"name":"jungnicl","password":"GGAnderson","token":"t225mqv6di3ned9grj0c2n3lit"})
print(addUser.text)