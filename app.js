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

//Lazy array of friends. Would probably delegate this to a DB.
const friends = [
  {
    name: 'Srushti Pai', number: process.env.MYFRIENDNUMBER
  },
];

const myNumber = process.env.MYNUMBER;

//Webhook for messagen sent from me
app.route('/me/inbound')
    .get(textFromMe)
    .post(textFromMe);

//Webhook for messages sent by my friends
app.route('/friends/inbound')
  .get(textFromFriends)
  .post(textFromFriends);

function textFromMe(request, response) {
  const incomingText = Object.assign(request.query, request.body);
  const textToSend = `${incomingText.text}\nPlease respond with Yes or No if you can join me!`;

  friends.forEach((friend) => {
    nexmo.message.sendSms(process.env.FRIENDSVIRTNUMBER, friend.number, textToSend);
  });

  response.status(204).send();
}

function textFromFriends(request, response) {
  const incomingText = Object.assign(request.query, request.body);

  if (incomingText.text.toLowerCase() !== 'yes' && incomingText.text.toLowerCase() !== 'no') {
    //User replied with invalid response.
    nexmo.message.sendSms(process.env.FRIENDSVIRTNUMBER, incomingText.msisdn, 'You replied with an invalid response. Please reply with yes or no.');
  } else {
    //Lazy lookup of friend's name. Again would probably like to do this using a HashMap, Cache store or DB
    friends.forEach((friend) => {
      if (friend.number === incomingText.msisdn) {
        //Send me text message reply.
        nexmo.message.sendSms(process.env.MYVIRTNUMBER, myNumber,
          `${friend.name} said ${incomingText.text.toLowerCase() === 'yes' ? 'yes!' : 'no...'}` //Make text look more natural.
        );
      }
    });
  }
  response.status(204).send();
}

//Start server
app.listen(process.env.PORT, process.env.IP, () => {
  console.log('Starting WebRTC Ventures App...');
});