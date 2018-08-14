const { appendFileSync, readFile, writeFile, writeFileSync } = require('fs');
const { join } = require('path');
const { createInterface } = require('readline');
const { endOfDay, startOfMonth, startOfTomorrow, subMonths, format } = require('date-fns');
const { read } = require('../credentials');
const { get } = require('../shared/api');

const TOKEN_PATH = join(__dirname, 'token.json');
const FOURSQUARE_URL = 'https://api.foursquare.com';

const getFoursquare = (accessToken) => (relativeUrl, options = {}) =>
  get(`${FOURSQUARE_URL}/${relativeUrl}`, { ...options, oauth_token: accessToken });

function getAccessToken (credentials, token) {
  return new Promise((resolve, reject) => {
    const { client_secret, client_id, redirect_uris } = credentials;

    try {
      const url = `https://foursquare.com/oauth2/authenticate?client_id=${client_id}&response_type=code&redirect_uri=${redirect_uris[0]}`;
      console.log(`Open this link to authorize the app: ${url}`);

      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question('Enter the code from that page here: ', async (code) => {
        rl.close();
        
        const res = await get('https://foursquare.com/oauth2/access_token', {
          client_id,
          client_secret,
          grant_type: 'authorization_code',
          redirect_uri: redirect_uris[0],
          code,
        });

        // Store the token to disk for later program executions
        writeFile(TOKEN_PATH, JSON.stringify({ access_token: res.access_token, code }), (err) => {
          if (err) {
            reject(Error(err));
          }
          console.log('Token stored to', TOKEN_PATH);
          resolve(res.access_token);
        });
      });
    } catch (e) {
      reject(Error(e.message));
    }
  });
}

function authorize () {
  return new Promise(async (resolve, reject) => {
    try {
      const credentials = read('foursquare.json');

      // Check if we have previously stored a token.
      readFile(TOKEN_PATH, 'utf8', async (err, file) => {
        const token = file && JSON.parse(file) || '';
        if (err || !token.access_token) {
          const newToken = await getAccessToken(credentials, token);
          return resolve(getFoursquare(newToken));
        }

        return resolve(getFoursquare(token.access_token));
      });
    } catch (e) {
      console.log('Foursquare API', e);
      reject(Error(e.message));
    }
  });
}

const getCheckinsApi = (getApi) => (start, end = Date.now(), limit = 100, offset = 0) => getApi('/v2/users/self/checkins', {
  afterTimestamp: start ? start.getTime() : undefined,
  beforeTimestamp: end ? end.getTime() : undefined,
  limit,
  offset,
  v: format(new Date(), 'YYYYMMDD'),
});

// const getCheckinsForDates = (getApi) => (start, end) => new Promise(async (resolve, reject) => {
//   const getter = getCheckinsApi(getApi);
  
//   try {
//     if (!start || !end) {
//       throw Error('Missing date for getCheckinsForDates');
//     }
//     let res = await getter(start, end, 250, 0); // may need setTimeout
//     debugger;
//     // while (res) { // get until no offset

//     // }
//     resolve();
//   } catch (e) {
//     reject(e);
//   }
// });

const getCheckinsAll = (getApi) => new Promise(async (resolve, reject) => {
  try {
    const fileName = join(__dirname, 'data', `all-${format(new Date(), 'MM-DD-HH-mm-ss')}.json`);
    const getCxs = getCheckinsApi(getApi);
    const maxLimit = 250;
    let offset = 0;
    let checkinsLeft;

    while (checkinsLeft > 0 || typeof checkinsLeft === 'undefined') {
      const res = await getCxs(null, null, maxLimit, offset);
      if (!res || !res.meta || res.meta.code !== 200) {
        reject('error during getCheckinsAll call', res, checkinsLeft, offset);
      }

      if (typeof checkinsLeft === 'undefined') {
        console.log(res);
        writeFileSync(fileName, '[');
        checkinsLeft = res.response.checkins.count - maxLimit;
      } else {
        checkinsLeft -= maxLimit;
      }

      offset += maxLimit;

      appendFileSync(fileName, `  ${JSON.stringify({ checkinsLeft, offset, items: res.response.checkins.items }, null, 2)},\n`);
    }

    appendFileSync(fileName, '];\n');
    console.log(`All check-ins logged to ${fileName}`);
  } catch (e) {
    console.log(e);
  }
});

async function getCheckins () {
  try {
    const getApi = await authorize();
    getCheckinsAll(getApi);
    // getCheckinsForDates(getApi)()
  } catch (e) {
    console.log(e);
  }
}

module.exports = {
  getCheckins,
};
