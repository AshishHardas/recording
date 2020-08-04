const ipcRenderer = require('electron').ipcRenderer;
const BrowserWindow = require('electron').remote.BrowserWindow;

var openvidu;
var session;
var publisher;
var mySessionId;
var gumStream;
var rec;
var input; 

var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContext;


ipcRenderer.on('screen-share-ready', (event, message) => {
// User has chosen a screen to share. screenId is message parameter
showSession();
publisher = openvidu.initPublisher("publisher", {
videoSource: "screen:" + message 

recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);
pauseButton.addEventListener("click", pauseRecording);

});
joinSession();
});

function initPublisher() {

openvidu = new OpenVidu();

const shareScreen = document.getElementById("screen-sharing").checked;
if (shareScreen) {
openScreenShareModal();
} else {
publisher = openvidu.initPublisher("publisher");
joinSession();
}
}

function joinSession() {

session = openvidu.initSession();
session.on("streamCreated", function (event) {
session.subscribe(event.stream, "subscriber");
});

mySessionId = document.getElementById("sessionId").value;

getToken(mySessionId).then(token => {
session.connect(token, {clientData: 'OpenVidu Electron'})
.then(() => {
showSession();
session.publish(publisher);
})
.catch(error => {
console.log("There was an error connecting to the session:", error.code, error.message);
});
});
}




var recordButton = document.getElementById("recordButton");
function startRecording() { console.log("recordButton clicked"); }

var constraints = {
    audio: true,
    video: false
} 

recordButton.disabled = true;
stopButton.disabled = false;
pauseButton.disabled = false


navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
    console.log("getUserMedia() success, stream created, initializing Recorder.js ..."); 
    
    gumStream = stream;
    
    input = audioContext.createMediaStreamSource(stream);
     rec = new Recorder(input, {
        numChannels: 1
    }) 
    
    rec.record()
    console.log("Recording started");
}).catch(function(err) {

    recordButton.disabled = false;
    stopButton.disabled = true;
    pauseButton.disabled = true
});
}

var stopButton = document.getElementById("stopButton");
function stopRecording() {
    console.log("stopButton clicked");
    stopButton.disabled = true;
    recordButton.disabled = false;
    pauseButton.disabled = true;
    pauseButton.innerHTML = "Pause";
    rec.stop();
    gumStream.getAudioTracks()[0].stop();
    
    rec.exportWAV(createDownloadLink);
}


var pauseButton = document.getElementById("pauseButton");
function pauseRecording() {
    console.log("pauseButton clicked rec.recording=", rec.recording);
    if (rec.recording) {
        rec.stop();
        pauseButton.innerHTML = "Resume";
    } else {
        rec.record()
        pauseButton.innerHTML = "Pause";
    }
}


function leaveSession() {
session.disconnect();
hideSession();
}

function showSession() {
document.getElementById("session-header").innerText = mySessionId;
document.getElementById("join").style.display = "none";
document.getElementById("session").style.display = "block";
}

function hideSession() {
document.getElementById("join").style.display = "block";
document.getElementById("session").style.display = "none";
}

function openScreenShareModal() {
let win = new BrowserWindow({
parent: require('electron').remote.getCurrentWindow(),
modal: true,
minimizable: false,
maximizable: false,
webPreferences: {
nodeIntegration: true
},
resizable: false
})
win.setMenu(null);
// win.webContents.openDevTools();

var theUrl = 'file://' + __dirname + '/modal.html'
win.loadURL(theUrl);
}

/**
* --------------------------
* SERVER-SIDE RESPONSIBILITY
* --------------------------
* These methods retrieve the mandatory user token from OpenVidu Server.
* This behavior MUST BE IN YOUR SERVER-SIDE IN PRODUCTION (by using
* the API REST, openvidu-java-client or openvidu-node-client):
* 1) Initialize a session in OpenVidu Server (POST /api/sessions)
* 2) Generate a token in OpenVidu Server (POST /api/tokens)
* 3) The token must be consumed in Session.connect() method
*/

var OPENVIDU_SERVER_URL = "https://localhost:4443";
var OPENVIDU_SERVER_SECRET = "MY_SECRET";

function getToken(mySessionId) {
return createSession(mySessionId).then(sessionId => createToken(sessionId));
}

function createSession(sessionId) { // See https://docs.openvidu.io/en/stable/reference-docs/REST-API/#post-apisessions
return new Promise((resolve, reject) => {
axios.post(
OPENVIDU_SERVER_URL + "/api/sessions",
JSON.stringify({
customSessionId: sessionId
}), {
headers: {
'Authorization': "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET),
'Content-Type': 'application/json',
},
crossdomain: true
}
)
.then(res => {
if (res.status === 200) {
// SUCCESS response from openvidu-server. Resolve token
resolve(res.data.id);
} else {
// ERROR response from openvidu-server. Resolve HTTP status
reject(new Error(res.status.toString()));
}
}).catch(error => {
if (error.response.status === 409) {
resolve(sessionId);
return false;
} else {
console.warn('No connection to OpenVidu Server. This may be a certificate error at ' + OPENVIDU_SERVER_URL);
return false;
}
});
return false;
});
}

function createToken(sessionId) { // See https://docs.openvidu.io/en/stable/reference-docs/REST-API/#post-apitokens
return new Promise((resolve, reject) => {
axios.post(
OPENVIDU_SERVER_URL + "/api/tokens",
JSON.stringify({
session: sessionId
}), {
headers: {
'Authorization': "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET),
'Content-Type': 'application/json',
'Access-Control-Allow-Origin': '*'
}
}
)
.then(res => {
if (res.status === 200) {
// SUCCESS response from openvidu-server. Resolve token
resolve(res.data.token);
} else {
// ERROR response from openvidu-server. Resolve HTTP status
reject(new Error(res.status.toString()));
}
}).catch(error => {
reject(error);
});
return false;
});
}
