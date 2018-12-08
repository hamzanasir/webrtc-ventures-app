require('dotenv').load();

const express = require('express');
const bodyParser = require('body-parser');
const Nexmo = require('nexmo');

//Initialize NEXMO library
const nexmo = new Nexmo({
  apiKey: process.env.NEXMOAPIKEY,
  apiSecret: process.env.NEXMOSECRET
});

const app = express();

//Basic express app initalization
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static(`${__dirname}/public`));

//Start server
app.listen(process.env.PORT, process.env.IP, () => {
  console.log('Starting WebRTC Ventures App...');
});