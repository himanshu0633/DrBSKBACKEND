const app = require("./app");

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});



// updated server.js:
// const https = require('https');
// const fs = require('fs');
// const app = require('./app'); // your existing app

// // SSL Certificate paths (replace with your actual paths)
// const sslOptions = {
//   key: fs.readFileSync('/path/to/private.key'),
//   cert: fs.readFileSync('/path/to/certificate.crt'),
//   ca: fs.readFileSync('/path/to/ca_bundle.crt') // if applicable
// };

// // Create both HTTP and HTTPS servers
// const httpPort = process.env.HTTP_PORT || 4000;
// const httpsPort = process.env.HTTPS_PORT || 4001;

// // HTTP server (for .in and IP)
// require('http').createServer(app).listen(httpPort, () => {
//   console.log(`HTTP server running on port ${httpPort}`);
// });

// // HTTPS server (for .com)
// https.createServer(sslOptions, app).listen(httpsPort, () => {
//   console.log(`HTTPS server running on port ${httpsPort}`);
// });