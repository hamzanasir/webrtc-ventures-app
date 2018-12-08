require('dotenv').load();

const express = require('express');
const bodyParser = require('body-parser');
const Nexmo = require('nexmo');
const nexmoNCCO = require('./phoneConvo.json');
const privateKey = require('fs').readFileSync('private.key');

//Initialize NEXMO library
const nexmo = new Nexmo({
  apiKey: process.env.NEXMOAPIKEY,
  apiSecret: process.env.NEXMOSECRET,
  applicationId: process.env.NEXMOAPPID,
  privateKey: privateKey,
});

const app = express();

//Basic express app initalization
app.use(bodyParser.json());
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

//Webhook for message sent from me
app.route('/me/inbound')
    .get(textFromMe)
    .post(textFromMe);

//Webhook for messages sent by my friends
app.route('/friends/inbound')
  .get(textFromFriends)
  .post(textFromFriends);

//Webhook for sending NCCO for call to friends
app.get('/friends/outbound/ncco', function (req, res) {
  res.status(200).send(nexmoNCCO);
});

//Webhook for recording their response and sending it back
app.post('/friends/outbound/response', function (req, res) {
  if (req.body.dtmf === '1') {
    nexmo.calls.get(req.body, function (err, result) {
      if (!err) {
        friends.forEach((friend) => {
          if (friend.number === result['_embedded'].calls[0].to.number) {
            //Send me text message reply.
            nexmo.message.sendSms(process.env.MYVIRTNUMBER, myNumber,
              `${friend.name} said yes.`
            );
          }
        });
      }
      res.status(201).send();
    });
  } else if (req.body.dtmf === '2') {
    nexmo.calls.get(req.body, function (err, result) {
      if (!err) {
        friends.forEach((friend) => {
          if (friend.number === result['_embedded'].calls[0].to.number) {
            //Send me text message reply.
            nexmo.message.sendSms(process.env.MYVIRTNUMBER, myNumber,
              `${friend.name} said no.`
            );
          }
        });
      }
      res.status(201).send();
    });
  } else {
    nexmo.message.sendSms(process.env.MYVIRTNUMBER, myNumber, "There was a problem in receiving one of your friend's response");
    res.status(201).send();
  }
});

//Handle text from me
function textFromMe(request, response) {
  const incomingText = Object.assign(request.query, request.body);
  const [parsedText, alertMethod] = incomingText.text.split(':');
  const textToSend = `${parsedText}\nPlease respond with Yes or No if you can join me!`;

  if (!alertMethod || alertMethod.toLowerCase().indexOf('text') === 0) {
    //Default to text
    friends.forEach((friend) => {
      nexmo.message.sendSms(process.env.FRIENDSVIRTNUMBER, friend.number, textToSend);
    });
  } else if (alertMethod.toLowerCase().indexOf('call') === 0) {
    //Call if method specified
    nexmoNCCO[0].text = `Hello there. Your friend would like to know ${parsedText}`; //Works for this example but would fail to work in prod

    friends.forEach((friend) => {
      nexmo.calls.create({
        to: [{
          type: 'phone',
          number: friend.number
        }],
        from: {
          type: 'phone',
          number: process.env.FRIENDSVIRTNUMBER
        },
        answer_url: ['https://5ecb078f.ngrok.io/friends/outbound/ncco']
      });
    });
  } else {
    //Invalid method
    nexmo.message.sendSms(process.env.MYVIRTNUMBER, myNumber, "You specified an invalid method.");
  }

  response.status(204).send();
}

//Handle text from friends
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