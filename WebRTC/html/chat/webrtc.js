var localVideo = null;
var peerConnection = null;
var peerConnectionConfig = ICE_SERVERS;
var wsURL = SERVER_URL;
var wsConnection = null;
var streamInfo = {applicationName:WOWZA_APPLICATION_NAME, streamName:WOWZA_STREAM_NAME, sessionId:WOWZA_SESSION_ID_EMPTY};
var userData = {param1:"value1"};
var webrtcPlayers = [];
var myInterval = null;
var publishStreamName = null;
var newAPI = false;

function pageReady()
{
    localVideo = document.getElementById('videoLOCALCAMERA');

    var constraints =
    {
        video: true,
        audio: true,
    };

	if(navigator.mediaDevices.getUserMedia)
	{
		navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
		newAPI = false;
	}
    else if(navigator.getUserMedia)
    {
        navigator.getUserMedia(constraints, getUserMediaSuccess, errorHandler);
    }
    else
    {
        alert('Your browser does not support getUserMedia API');
    }
	
	console.log("newAPI: "+newAPI);

    myInterval = setInterval(queryAvailableStreams, 3000);

    var cookieWSURL = $.cookie("webrtcPublishWSURL");
    if (cookieWSURL === undefined)
    {
		cookieWSURL = wsURL;
		$.cookie("webrtcPublishWSURL", cookieWSURL);
	}
	console.log('cookieWSURL: '+cookieWSURL);

    var cookieApplicationName = $.cookie("webrtcPublishApplicationName");
    if (cookieApplicationName === undefined)
    {
		cookieApplicationName = streamInfo.applicationName;
		$.cookie("webrtcPublishApplicationName", cookieApplicationName);
	}
	console.log('cookieApplicationName: '+cookieApplicationName);

	$('#sdpURL').val(cookieWSURL);
	$('#applicationName').val(cookieApplicationName);
	$('#streamName').val(cookieStreamName);

    var cookieStreamName = $.cookie("webrtcDemoStreamName");
    if (cookieStreamName === undefined)
    {
		cookieStreamName = Math.floor((Math.random() * 2147483647) + 1);
		$.cookie("webrtcDemoStreamName", cookieStreamName);
	}
	console.log('cookieStreamName: '+cookieStreamName);

	$('#streamName').val(cookieStreamName);
	$("#buttonPublish").attr('value', GO_BUTTON_JOIN);
}

function dotest(streamName)
{
	$("#video"+streamName).show();
}

function startPublisher()
{
	wsURL = $('#sdpURL').val();
	streamInfo.applicationName = $('#applicationName').val();

	$.cookie("webrtcPublishWSURL", wsURL, { expires: 365 });
	$.cookie("webrtcPublishApplicationName", streamInfo.applicationName, { expires: 365 });

	var streamName = $('#streamName').val();

	streamName = streamName.replace(/ /g, '');

	streamInfo.streamName = streamName;
	publishStreamName = streamName;

	wsConnect(wsURL);

	$("#buttonPublish").attr('value', GO_BUTTON_LEAVE);
	$("#streamName").attr("disabled", true);
}

function stopPublisher()
{
	if (peerConnection != null)
		peerConnection.close();
	peerConnection = null;
	publishStreamName = null;

	if (wsConnection != null)
		wsConnection.close();
	wsConnection = null;
	
	for(var streamName in webrtcPlayers)
	{
		$( '#video'+streamName ).remove();
	}
	
	webrtcPlayers = [];

	$("#buttonPublish").attr('value', GO_BUTTON_JOIN);
	$("#streamName").attr("disabled", false);
}

function start()
{
	if (publishStreamName == null)
	{
		startPublisher();
	}
	else
	{
		stopPublisher();
	}
}

function queryAvailableStreams()
{
	if (wsConnection != null)
		wsConnection.send('{"direction":"publish", "command":"getAvailableStreams", "streamInfo":'+JSON.stringify(streamInfo)+', "userData":'+JSON.stringify(userData)+'}');
}

function updateRunningStreams(availableStreams)
{
	var validStreams = [];
	var runningStreams = [];
	
	for(var index in webrtcPlayers)
	{
		runningStreams.push(index);
	}

	for(var index in availableStreams)
	{
		var streamName = availableStreams[index].streamName;
		var readyAudio = availableStreams[index].readyAudio;
		var readyVideo = availableStreams[index].readyVideo;
		var codecAudio = availableStreams[index].codecAudio;
		var codecVideo = availableStreams[index].codecVideo;

		while(true)
		{
			if (streamName == publishStreamName)
				break;

			if (!readyAudio && !readyVideo)
				break;

			if (readyVideo && !(codecVideo == CODEC_VIDEO_VPX))
				break;

			if (readyAudio && !(codecAudio == CODEC_AUDIO_OPUS || codecAudio == CODEC_AUDIO_VORBIS))
				break;

			var rindex = runningStreams.indexOf(streamName);
			if (rindex >= 0)
				runningStreams.splice(rindex, 1);

			console.log("updateRunningStreams: startVideoPlayer: "+streamName);
			startVideoPlayer(streamInfo.applicationName, streamName);
			break;
		}
	}

	for(var index in runningStreams)
	{
		stopVideoPlayer(runningStreams[index]);
	}
}

function onPlayStart(streamName)
{
	$("#video"+streamName).show();
}

function startVideoPlayer(applicationName, streamName)
{
	console.log('startVideoPlayer: application:'+applicationName+' stream:'+streamName);
	if (webrtcPlayers[streamName] == undefined)
	{
		webrtcPlayers[streamName] = new WebRTCPlayer(applicationName, streamName, wsConnection);

		$( '#videoContainer' ).append( '<video id="video'+streamName+'" onplay="onPlayStart(\''+streamName+'\')" autoplay style="height:288px;margin:5px;display:none;"></video>');

		webrtcPlayers[streamName].start();
	}
}

function stopVideoPlayer(streamName)
{
	console.log('stopVideoPlayer: '+streamName);
	if (webrtcPlayers[streamName] !== undefined)
	{
		webrtcPlayers[streamName].shutdown();
		delete webrtcPlayers[streamName];
		$( '#video'+streamName ).remove();
	}
}

function wsConnect(url)
{
	wsConnection = new WebSocket(url);
	wsConnection.binaryType = 'arraybuffer';
	
	wsConnection.onopen = function()
	{
		console.log("wsConnection.onopen");
		
		peerConnection = new RTCPeerConnection(peerConnectionConfig);
		peerConnection.onicecandidate = gotIceCandidate;
		
		if (newAPI)
		{
			var localTracks = localStream.getTracks();
			for(localTrack in localTracks)
			{
				peerConnection.addTrack(localTracks[localTrack], localStream);
			}
		}
		else
		{
			peerConnection.addStream(localStream);
		}

		peerConnection.createOffer(gotDescription, errorHandler);
	}
	
	wsConnection.onmessage = function(evt)
	{
		console.log("wsConnection.onmessage: "+evt.data);
		
		var msgJSON = JSON.parse(evt.data);
		
		var msgStatus = Number(msgJSON['status']);
		var msgCommand = msgJSON['command'];
		var msgDescription = msgJSON['statusDescription'];
		
		console.log('command['+msgStatus+']: '+msgCommand+" :"+msgDescription);
		
		if ('sendResponse'.localeCompare(msgCommand) == 0 || 'getOffer'.localeCompare(msgCommand) == 0)
		{
			var msgStreamName = msgJSON['streamInfo']['streamName'];
						
			if (webrtcPlayers[msgStreamName] != undefined)
				webrtcPlayers[msgStreamName].onmessage(evt);
		}
		else if ('sendOffer'.localeCompare(msgCommand) == 0)
		{
			if (msgStatus != 200)
			{
				stopPublisher();

				$("#statusMessages").text(msgDescription);
			}
			else
			{
				$("#statusMessages").text('');
			}
			
			var sdpData = msgJSON['sdp'];
			if (sdpData !== undefined)
			{
				peerConnection.setRemoteDescription(new RTCSessionDescription(sdpData), function() {
					//peerConnection.createAnswer(gotDescription, errorHandler);
				}, errorHandler);
			}

			var iceCandidates = msgJSON['iceCandidates'];
			if (iceCandidates !== undefined)
			{
				for(var index in iceCandidates)
				{
					console.log('iceCandidates: '+iceCandidates[index]);

					peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidates[index]));
				}
			}
		}
		else if ('getAvailableStreams'.localeCompare(msgCommand) == 0)
		{
			var availableStreams = msgJSON['availableStreams'];
			if (availableStreams !== undefined)
			{
				updateRunningStreams(availableStreams);
			}
			else
			{
				updateRunningStreams([]);
			}
		}
	}
	
	wsConnection.onclose = function()
	{
		console.log("wsConnection.onclose");
	}
	
	wsConnection.onerror = function(evt)
	{
		console.log("wsConnection.onerror: "+JSON.stringify(evt));
		
		$("#sdpDataTag").html('WebSocket connection failed: '+wsURL);
		stopPublisher();
	}
}

function getUserMediaSuccess(stream)
{
    localStream = stream;
    localVideo.src = window.URL.createObjectURL(stream);
}

function gotIceCandidate(event)
{
    if (event.candidate != null)
    {
    	console.log('gotIceCandidate: '+JSON.stringify({'ice': event.candidate}));
    }
}

function gotDescription(description)
{
    console.log('gotDescription[publish]: '+JSON.stringify({'sdp': description}));

    peerConnection.setLocalDescription(description, function () {

        wsConnection.send('{"direction":"publish", "command":"sendOffer", "streamInfo":'+JSON.stringify(streamInfo)+', "sdp":'+JSON.stringify(description)+', "userData":'+JSON.stringify(userData)+'}');

    }, function() {console.log('setDescription[publish]: error')});
}

function errorHandler(error)
{
    console.log(error);
}
