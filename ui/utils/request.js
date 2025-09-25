const { apiBase } = require('../config');

function getToken() {
  try { return wx.getStorageSync('token') || ''; } catch { return ''; }
}

function request(method, url, data = {}, opts = {}) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    wx.request({
      url: apiBase + url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
        ...(opts.header || {})
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
        else reject(new Error(res.data || ('HTTP ' + res.statusCode)));
      },
      fail(err) { reject(err); }
    });
  });
}

module.exports = {
  get: (u, d, o) => request('GET', u, d, o),
  post: (u, d, o) => request('POST', u, d, o),
  put: (u, d, o) => request('PUT', u, d, o),
  del: (u, d, o) => request('DELETE', u, d, o)
}

