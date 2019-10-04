var express = require('express');
var router = express.Router();



var path = require('path');
var _ = require('lodash');

var apiKey = process.env.TOKBOX_API_KEY;
var secret = process.env.TOKBOX_SECRET;

//var apiKey = '46432412';
//var secret = '3cb47afe1a3da244f776b6a70094fadc5484f408';

try{
  console.log("process.env.TOKBOX_API_KEY:",process.env.TOKBOX_API_KEY);  
  console.log("process.env.TOKBOX_SECRET:",process.env.TOKBOX_SECRET);
  console.log("apiKey:",apiKey);
  console.log("secret:",secret);
} 
catch(error){
  console.error(error);
}

if (!apiKey || !secret) {
  console.error('=========================================================================================================');
  console.error('');
  console.error('apiKey o secret no establecidas');  
  console.error('Then add them to ', path.resolve('.env'), 'or as environment variables' );
  console.error('');
  console.error('=========================================================================================================');
  process.exit();
}

var OpenTok = require('opentok');
var opentok = new OpenTok(apiKey, secret);

// IMPORTANT: roomToSessionIdDictionary is a variable that associates room names with unique
// unique sesssion IDs. However, since this is stored in memory, restarting your server will
// reset these values if you want to have a room-to-session association in your production
// application you should consider a more persistent storage

var roomToSessionIdDictionary = {};

// returns the room name, given a session ID that was associated with it
function findRoomFromSessionId(sessionId) {
  return _.findKey(roomToSessionIdDictionary, function (value) { return value === sessionId; });
}

router.get('/', function (req, res) {
  res.render('index', { title: 'Learning-OpenTok-Node' });
});

/**
 * GET /session redirects to /room/session
 */
router.get('/session', function (req, res) {
  res.redirect('/room/session');
});

/**
 * GET /room/:name
 */
router.get('/room/:name', function (req, res) {
  var roomName = req.params.name;
  var sessionId;
  var token;
  console.log('attempting to create a session associated with the room: ' + roomName);

  // if the room name is associated with a session ID, fetch that
  if (roomToSessionIdDictionary[roomName]) {
    sessionId = roomToSessionIdDictionary[roomName];

    // generate token
    token = opentok.generateToken(sessionId);
    res.setHeader('Content-Type', 'application/json');
    res.send({
      apiKey: apiKey,
      sessionId: sessionId,
      token: token
    });
  }
  // if this is the first time the room is being accessed, create a new session ID
  else {
    opentok.createSession({ mediaMode: 'routed' }, function (err, session) {
      if (err) {
        console.log(err);
        res.status(500).send({ error: 'createSession error:' + err });
        return;
      }

      // now that the room name has a session associated wit it, store it in memory
      // IMPORTANT: Because this is stored in memory, restarting your server will reset these values
      // if you want to store a room-to-session association in your production application
      // you should use a more persistent storage for them
      roomToSessionIdDictionary[roomName] = session.sessionId;

      // generate token
      token = opentok.generateToken(session.sessionId);
      res.setHeader('Content-Type', 'application/json');
      res.send({
        apiKey: apiKey,
        sessionId: session.sessionId,
        token: token
      });
    });
  }
});

/**
 * POST /archive/start
 */
router.post('/archive/start', function (req, res) {
  var json = req.body;
  var sessionId = json.sessionId;
  opentok.startArchive(sessionId, { name: findRoomFromSessionId(sessionId) }, function (err, archive) {
    if (err) {
      console.error('error in startArchive');
      console.error(err);
      res.status(500).send({ error: 'startArchive error:' + err });
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(archive);
  });
});

/**
 * POST /archive/:archiveId/stop
 */
router.post('/archive/:archiveId/stop', function (req, res) {
  var archiveId = req.params.archiveId;
  console.log('attempting to stop archive: ' + archiveId);
  opentok.stopArchive(archiveId, function (err, archive) {
    if (err) {
      console.error('error in stopArchive');
      console.error(err);
      res.status(500).send({ error: 'stopArchive error:' + err });
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(archive);
  });
});

/**
 * GET /archive/:archiveId/view
 */
router.get('/archive/:archiveId/view', function (req, res) {
  var archiveId = req.params.archiveId;
  console.log('attempting to view archive: ' + archiveId);
  opentok.getArchive(archiveId, function (err, archive) {
    if (err) {
      console.error('error in getArchive');
      console.error(err);
      res.status(500).send({ error: 'getArchive error:' + err });
      return;
    }

    if (archive.status === 'available') {
      res.redirect(archive.url);
    } else {
      res.render('view', { title: 'Archiving Pending' });
    }
  });
});

/**
 * GET /archive/:archiveId
 */
router.get('/archive/:archiveId', function (req, res) {
  var archiveId = req.params.archiveId;

  // fetch archive
  console.log('attempting to fetch archive: ' + archiveId);
  opentok.getArchive(archiveId, function (err, archive) {
    if (err) {
      console.error('error in getArchive');
      console.error(err);
      res.status(500).send({ error: 'getArchive error:' + err });
      return;
    }

    // extract as a JSON object
    res.setHeader('Content-Type', 'application/json');
    res.send(archive);
  });
});

/**
 * GET /archive
 */
router.get('/archive', function (req, res) {
  var options = {};
  if (req.query.count) {
    options.count = req.query.count;
  }
  if (req.query.offset) {
    options.offset = req.query.offset;
  }

  // list archives
  console.log('attempting to list archives');
  opentok.listArchives(options, function (err, archives) {
    if (err) {
      console.error('error in listArchives');
      console.error(err);
      res.status(500).send({ error: 'infoArchive error:' + err });
      return;
    }

    // extract as a JSON object
    res.setHeader('Content-Type', 'application/json');
    res.send(archives);
  });
});

/**
 * GET /Sample AgentInfo Rest Api Server to create in Heroku
 */
router.get('/agentinfo/:agentlogin', function (req, res) {
  var agentinfo = {};
  agentinfo.login = req.params.agentlogin;
  agentinfo.status= "logged";
  agentinfo.station= "1500";
  agentinfo.name= "Raul";
  agentinfo.lastname= "Ortega";  
  res.send(agentinfo);
});

/**
 * GET /Sample QueueInfo Rest Api Server to create in Heroku
 */
router.get('/queueinfo/:queue', function (req, res) {
  var queueinfo = {};
  queueinfo.queue = req.params.queue;
  queueinfo.loged = 5;
  queueinfo.ready = 4;
  queueinfo.available = 3;
  queueinfo.busy = 1;
  queueinfo.calls = 2;
  queueinfo.oldestcall = 53;
  res.send(queueinfo);
});
/**
 * GET /Sample QueueInfo Rest Api Server to create in Heroku
 */
router.get('/customerinfobyphone/:phone', function (req, res) {
  var customerinfo = {};
  customerinfo.phone = req.params.phone;
  if (customerinfo.phone=='699479614'){
    customerinfo.name='Raul';
    customerinfo.lastname='Ortega';
    customerinfo.dni='52864896v';
    customerinfo.incidencia=true;
    customerinfo.devices=[
      {
        serial:'SES0001',
        model:'Amelia',
        version:'0001',
        status:'active'
      },
      {
        serial:'SES0002',
        model:'Reloj',
        version:'0001',
        status:'active'
      }      
    ];
  }
  else{
    if (customerinfo.phone=='0034699479614'){
      customerinfo.name='Raul';
      customerinfo.lastname='Ortega';
      customerinfo.dni='52864896v';
      customerinfo.incidencia=false;
      customerinfo.devices=[
        {
          serial:'SES0001',
          model:'Amelia',
          version:'0001',
          status:'active'
        },
        {
          serial:'SES0002',
          model:'Reloj',
          version:'0001',
          status:'active'
        }      
      ];
    }
    else{
      customerinfo.name='Jose';
      customerinfo.lastname='Maforo';
      customerinfo.dni='528887799F';
      customerinfo.incidencia=true;
      customerinfo.devices=[
        {
          serial:'SES0005',
          model:'Amelia',
          version:'0001',
          status:'active'
        },
        {
          serial:'SES0008',
          model:'Reloj',
          version:'0001',
          status:'active'
        }      
      ];      
    }
  }
  res.send(customerinfo);
});

module.exports = router;
