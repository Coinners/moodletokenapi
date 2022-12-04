# Moodle Api (Work in Progress)

[![Go Report Card](https://img.shields.io/badge/javascript%20report-A+-brightgreen.svg?style=flat)](https://github.com/Coinmaster123456/moodletokenapi)
[![Build Status](https://github.com/sodafoundation/api/actions/workflows/ci.yml/badge.svg)](https://github.com/Coinmaster123456/moodletokenapi)
[![Releases](https://img.shields.io/github/release/sodafoundation/api/all.svg?style=flat-square)](https://github.com/Coinmaster123456/moodletokenapi)
[![LICENSE](https://img.shields.io/badge/license-MIT-brightgreen?style=flat-square)](https://github.com/Coinmaster123456/moodletokenapi/blob/main/LICENSE)

<img src="https://cdn.discordapp.com/icons/919663738041274408/90924f0599a9e8582a7ebaf92135b4b5.png?size=512" width="400" height="400">

## Introduction
Welcome to the docs for communicating with the Moodle Token Servers. This docs are for developing your own client or for manipulating data programmatically.

**Communication/Protocols used:**
Communication with the servers is currently supported through the use of the http/https protocol. All available methods are listed below.

**Authorization:**
The servers don't use any kind of authorization at the moment of writing this. This may change in the future but it isn't planned for the moment.

**URL Parameters:**
A request will always require the following parameters:
`serverip`: The ip address or domain of the server
`classid`: The Version 4 UUID of the class

## Methods:
`GET http://serverip/classid`
Gets all entries of `classid`

`POST http://serverip/classid/add`
Adds an entry to `classid`
> Requires Entry Payload:
```json
{
  "name":"name of person",
  "token":"token of the person"
}
```
**Responses:**
The server will always reply with a json object containing following data, for example:
```json
{
  "error-code":200, //will always be a valid http status code
  "error-message":"OK", //contains an error message or OK
  "data":[ //will be empty or contain content depending on the case
    {"name":"demo person","time":1648014517,"token":"oerusngrkggkjregm"},
    {"name":"demo person2","time":1648014517,"token":"oerusngrkggkjregm"}
  ]
}
```
```json
{
  "error-code":404,
  "error-message":"This class couldn't be found",
  "data":[]
}
```
```json
{
  "error-code":400,
  "error-message":"The givin token is invalid",
  "data":[]
}
```
**Add classes:**
This is currently only available for the server admins. Contact them for adding a class
