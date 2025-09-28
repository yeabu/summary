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
  del: (u, d, o) => request('DELETE', u, d, o),
  // 文件上传：用于票据上传等
  upload: (url, filePath, formData = {}, opts = {}) => new Promise((resolve, reject) => {
    const token = getToken();
    wx.uploadFile({
      url: apiBase + url,
      filePath,
      name: 'file',
      formData,
      header: {
        ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
        ...(opts.header || {})
      },
      success(res){
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
            resolve(data);
          } else {
            reject(new Error('HTTP ' + res.statusCode));
          }
        } catch (e) { reject(e); }
      },
      fail(err){ reject(err); }
    })
  })
}
