const http = require('http');

const data = JSON.stringify({
  email: 'admin@omni.com',
  password: 'admin',
  nome: 'Admin OMNI'
});

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/v1/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response:', body));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
