var WebRTCPlayer = function(applicationName, streamName, wsConnection)
{
	this.remoteVideo = null;
	this.peerConnection = null;
	this.peerConnectionConfig = ICE_SERVERS;
	this.streamInfo = {applicationName:WOWZA_APPLICATION_NAME, streamName:WOWZA_STREAM_NAME, sessionId:WOWZA_SESSION_ID_EMPTY};
	this.streamInfo.applicationName = applicationName;
	this.streamInfo.streamName = streamName;
	this.wsConnection = wsConnection;
};

WebRTCPlayer.prototype.onmessage = function(evt)
{
	var self = this;

	var msgJSON = JSON.parse(evt.data);

	var msgStatus = Number(msgJSON['status']);
	var msgCommand = msgJSON['command'];
	var msgDescription = msgJSON['statusDescription'];
	
	if (msgStatus == 200)
	{
		var streamInfoResponse = msgJSON['streamInfo'];
		if (streamInfoResponse !== undefined)
		{
			self.streamInfo.sessionId = streamInfoResponse.sessionId;
		}

		var sdpData = msgJSON['sdp'];
		if (sdpData !== undefined)
		{
			console.log('sdp: '+msgJSON['sdp']);

			self.peerConnection.setRemoteDescription(new RTCSessionDescription(msgJSON['sdp']), function() {
				self.peerConnection.createAnswer(function(description) {

						console.log('getDescription[play]');

						self.peerConnection.setLocalDescription(description,
							function () {

								self.wsConnection.send('{"direction":"play", "command":"sendResponse", "streamInfo":'+JSON.stringify(self.streamInfo)+', "sdp":'+JSON.stringify(description)+', "userData":'+JSON.stringify(userData)+'}');

								},
							function() {

								console.log('setDescription[play]: error')
								}
							);
					}, self.errorHandler);
			}, self.errorHandler);
		}

		var iceCandidates = msgJSON['iceCandidates'];
		if (iceCandidates !== undefined)
		{
			for(var index in iceCandidates)
			{
				console.log('iceCandidates: '+iceCandidates[index]);

				self.peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidates[index]));
			}
		}
	}
	else
	{
		console.log("player startup failed, kill myself: streamName:"+self.streamInfo.streamName+' status:'+msgStatus+' description:'+msgDescription);
		delete webrtcPlayers[self.streamInfo.streamName];
	}
}

WebRTCPlayer.prototype.shutdown = function()
{
	if (this.peerConnection != null)
		this.peerConnection.close();
	this.peerConnection = null;
}

WebRTCPlayer.prototype.start = function()
{
    var self = this;

    this.remoteVideo = document.getElementById('video'+this.streamInfo.streamName);

    this.peerConnection = new RTCPeerConnection(this.peerConnectionConfig);

    this.peerConnection.onicecandidate = function(event) {
		};

	if (newAPI)
	{
		this.peerConnection.ontrack = function(event) {
			self.remoteVideo.src = window.URL.createObjectURL(event.streams[0]);
			};
	}
	else
	{
		this.peerConnection.onaddstream = function(event) {
			self.remoteVideo.src = window.URL.createObjectURL(event.stream);
			};
	}

	this.wsConnection.send('{"direction":"play", "command":"getOffer", "streamInfo":'+JSON.stringify(this.streamInfo)+', "userData":'+JSON.stringify(userData)+'}');
};

WebRTCPlayer.prototype.errorHandler = function(error)
{
    console.log(error);
};
