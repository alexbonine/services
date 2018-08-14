const { read } = require('../../credentials');
const { readFile, writeFile } = require('fs');
const { createInterface } = require('readline');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = 'token.json';

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken (oAuth2Client) {
  return new Promise((resolve, reject) => {
    try {
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
      });

      console.log('Authorize this app by visiting this url:', authUrl);
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
          if (err) {
            return console.error('Error retrieving access token', err);
          }

          oAuth2Client.setCredentials(token);
          // Store the token to disk for later program executions
          writeFile(TOKEN_PATH, JSON.stringify(token), (errWrite) => {
            if (errWrite) {
              console.error(errWrite);
              return reject(Error(errWrite));
            }
            console.log('Token stored to', TOKEN_PATH);
          });

          return resolve(oAuth2Client);
        });
      });
    } catch (e) {
      reject(Error(e.message));
    }
  });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize () {
  return new Promise(async (resolve, reject) => {
    try {
      const credentials = read('google-calendar.json');
      const { client_secret, client_id, redirect_uris } = credentials.installed;
      const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

      // Check if we have previously stored a token.
      readFile(TOKEN_PATH, 'utf8', async (err, token) => {
        if (err) {
          const client = await getAccessToken(oAuth2Client);
          resolve(google.calendar({ version: 'v3', auth: client }));
        }

        oAuth2Client.setCredentials(JSON.parse(token));
        resolve(google.calendar({ version: 'v3', auth: oAuth2Client }));
      });
    } catch (e) {
      console.log('Google Calandar API', e);
      reject(Error(e.message));
    }
  });
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents (calendar) {
  return new Promise((resolve, reject) => {
    calendar.events.list({
      calendarId: 'primary',
      timeMin: (new Date()).toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    }, (err, res) => {
      if (err) {
        return reject(`The API returned an error: ${ err}`);
      }

      const events = res.data.items;
      if (events.length) {
        console.log('Upcoming 10 events:');
        events.map((event, i) => {
          const start = event.start.dateTime || event.start.date;
          console.log(`${start} - ${event.summary}`);
        });
      } else {
        console.log('No upcoming events found.');
      }

      return resolve('listEvents Completed');
    });
  });
}

function createCalendar (calendar, summary = 'New Calendar') {
  return new Promise((resolve, reject) => {
    calendar.calendars.insert({ requestBody: { summary } }, (err, res) => {
      if (err) {
        return reject(Error(err));
      }

      return resolve();
    });
  });
}

function createEvents () {

}

async function getEvents () {
  try {
    const calendar = await authorize();
    listEvents(calendar);
    // createCalendar(calendar, 'Swarm Check-ins');
  } catch (e) {
    console.log(e);
  }
}

module.exports = {
  getEvents,
};
