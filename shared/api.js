const fetch = require('node-fetch');
const qs = require('qs');

async function fetching (url = '', options = { method: 'GET' }) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(JSON.stringify(url), options);
      const res = await fetch(url);
      resolve(res.json());
    } catch (e) {
      reject(Error(e.message));
    }
  });
}

const get = (url = '', queryParams = {}) => fetching(`${url}?${qs.stringify(queryParams)}`, {
  method: 'GET',
});

const post = (url = '', body = {}) => fetching(url, {
  method: 'POST',
  body: qs.stringify(body), //JSON.stringify(body),
  headers: { 'Content-Type': 'application/json' },
});

const put = (url = '', body = {}) => fetching(url, {
  method: 'PUT',
  body: qs.stringify(body), //JSON.stringify(body),
  headers: { 'Content-Type': 'application/json' },
});

const del = (url = '') => fetching(url, {
  method: 'DELETE',
});

module.exports = {
  del,
  get,
  post,
  put,
};
