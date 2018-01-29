const http = require('http');
const express = require('express');
const app = express();
const striptags = require('striptags');
const axios = require('axios');
const MessagingResponse = require('twilio').twiml.MessagingResponse;

const contentTypeXml = {'Content-Type': 'text/xml'};

const forecastRegions = [
  'little-yoho',
  'banff-yoho-kootenay',
  'northwest-coastal',
  'northwest-inland',
  'sea-to-sky',
  'south-coast-inland',
  'south-coast',
  'north-rockies',
  'cariboos',
  'north-columbia',
  'south-columbia',
  'purcells',
  'kootenay-boundary',
  'south-rockies',
  'lizard-range',
  'vancouver-island',
  'jasper',
  'kananaskis',
  'waterton',
  //'chic-chocs',
  'glacier'
];

function verifyRegion(region) {
  return (forecastRegions.indexOf(region) != -1);
}

function buildHelpMessage() {
  var helpMessage = 'Please send a message containing ONLY one of the following regions in the body:\n';
  for (var i = 0; i < forecastRegions.length; i++) {
    helpMessage += forecastRegions[i] + '\n';
  }
  return helpMessage;
}

function buildSMSAvyForecast(avyForecast) {
  var message = '';
  for (var i = 0; i < avyForecast.dangerRatings.length; i++) {
    message += avyForecast.dangerRatings[i].date.substring(0,10) + '('
             + avyForecast.dangerRatings[i].dangerRating.alp.substring(0,1) + '-'
             + avyForecast.dangerRatings[i].dangerRating.tln.substring(0,1) + '-'
             + avyForecast.dangerRatings[i].dangerRating.btl.substring(0,1) + ')'
  }
  message += "#"
  for (var i = 0; i < avyForecast.problems.length; i++) {
    message += avyForecast.problems[i].type
             + JSON.stringify(avyForecast.problems[i].elevations)
             + JSON.stringify(avyForecast.problems[i].aspects)
             + avyForecast.problems[i].likelihood + ':'
  }
  message += striptags(avyForecast.highlights);
  message = message.replace(/\"/g, "");
  return message;
}

function closeResponse(appResponse, twiml) {
  appResponse.writeHead(200, contentTypeXml);
  appResponse.end(twiml.toString());
}

// to support URL-encoded POST request bodies
app.use(express.urlencoded({
  extended: true
}));

app.all('/sms', (appRequest, appResponse) => {
  const twiml = new MessagingResponse();
  var message = '';
  region = appRequest.body.Body ? appRequest.body.Body.toLowerCase() : '';

  if (verifyRegion(region) === true) {
    console.log('Sending forecast for ' + region + ' to ' + appRequest.body.From + ' at ' + Date.now());
    axios.get('http://www.avalanche.ca/api/forecasts/' + region + '.json')
      .then(getResponse => {
        message = buildSMSAvyForecast(getResponse.data);
        twiml.message(message);
        closeResponse(appResponse, twiml);
      })
      .catch(error => {
        console.log("Error: ", error);
        twiml.message("An error occurred retrieving the forecast for " + region + ".");
        closeResponse(appResponse, twiml);
      });
  } else {
    console.log('Sending helpMessage at ' + Date.now());
    twiml.message(buildHelpMessage());
    closeResponse(appResponse, twiml);
  }
});

http.createServer(app).listen(37742, () => {
  console.log('Express server listening on port 37742');
});
