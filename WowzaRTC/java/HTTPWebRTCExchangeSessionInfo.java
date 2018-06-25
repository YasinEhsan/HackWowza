package com.wowza.wms.webrtc.http;

import com.wowza.wms.http.*;
import com.wowza.wms.logging.*;
import com.wowza.wms.util.*;
import com.wowza.wms.vhost.*;
import com.wowza.wms.webrtc.model.*;
import com.wowza.wms.websocket.model.*;

public class HTTPWebRTCExchangeSessionInfo extends HTTPProvider2Base
{
    private static final Class<HTTPWebRTCExchangeSessionInfo> CLASS = HTTPWebRTCExchangeSessionInfo.class;
	private static final String CLASSNAME = "HTTPWebRTCExchangeSessionInfo";
	
	public static final String MIMETYPE_JSON = "application/json";

	public static final String STRING_ENCODING = "UTF-8";
	
	protected class CommandControl
	{
		public boolean canPublish = true;
		public boolean canPlay = true;
		public boolean canQuery = true;
	}
	
	protected class CommandContext
	{
		public IVHost vhost = null;
		public String reqURI = null;
		public WebRTCCommandRequest commandRequest = null;
		public IWebSocketSession webSocketSession = null;
		
		public CommandContext(IVHost vhost, IWebSocketSession webSocketSession, String reqURI, WebRTCCommandRequest commandRequest)
		{
			this.vhost = vhost;
			this.webSocketSession = webSocketSession;
			this.reqURI = reqURI;
			this.commandRequest = commandRequest;
		}
	}
		
	// WebSocket listener
	protected class MyWebSocketListener extends WebSocketEventNotifyBase
	{
		private IVHost vhost = null;
		
		public MyWebSocketListener(IVHost vhost)
		{
			this.vhost = vhost;
		}
		
		@Override
		public void onCreate(IWebSocketSession webSocketSession)
		{
			websocketSessionCreate(webSocketSession);
		}

		@Override
		public void onDestroy(IWebSocketSession webSocketSession)
		{
			websocketSessionDestroy(webSocketSession);
		}

		@Override
		public void onMessage(IWebSocketSession webSocketSession, WebSocketMessage message)
		{
			if (message.isText())
			{
				String responseStr = handleMessage(vhost, webSocketSession.getReqURI(), webSocketSession, message.getValueString());
				
				WebSocketMessage messageText = WebSocketMessage.createMessageText(webSocketSession.isMaskOutgoingMessages(), responseStr);
				webSocketSession.sendMessage(messageText);
			}
		}
	}
	
	protected void authenticateRequest(CommandContext commandContext, CommandControl commandControl)
	{
		// this is the best place to validate the request. You have
		// access to the request URI (reqURI) and the JSON
		// sent by the player. Set the above booleans to block publish, play or query.
		// You can add additional data to the JSON
		// payload if you like as long as you do not disturb the fields
		// needed for operation.
	}
	
	protected void websocketSessionCreate(IWebSocketSession webSocketSession)
	{
		
	}
	
	protected void websocketSessionDestroy(IWebSocketSession webSocketSession)
	{
		
	}

	public String handleMessage(IVHost vhost, String reqURI, IWebSocketSession webSocketSession, String bodyBufferStr)
	{
		StringBuffer responseStr = new StringBuffer();
		
		WebRTCCommandRequest commandRequest = null;
		if (bodyBufferStr != null)
			commandRequest = WebRTCCommandRequest.parseJSON(bodyBufferStr);
		
		if (commandRequest != null)
		{			
			WebRTCCommandResponse commandResponse = new WebRTCCommandResponse();
			
			String remoteIpAddress = webSocketSession.getRemoteIpAddress();
			if (remoteIpAddress != null)
				commandRequest.setRemoteIpAddress(remoteIpAddress);
			
			String remoteHost = webSocketSession.getRemoteHost();
			if (remoteHost != null)
				commandRequest.setRemoteHost(remoteHost);
			
			boolean didCommand = true;
			
			CommandControl commandControl = new CommandControl();
			
			authenticateRequest(new CommandContext(vhost, webSocketSession, reqURI, commandRequest), commandControl);
			
			String commandStr = commandRequest.getCommand();
			if (commandStr.equals("sendOffer"))
			{
				if (commandControl.canPublish)
					WebRTCCommands.sendOffer(vhost, commandRequest, commandResponse);
				else
				{
					responseStr.append("{");
					responseStr.append("\"status\":"+WebRTCCommands.STATUS_REQUESTED_DENIED+",");
					responseStr.append("\"statusDescription\":\""+"Request denied"+"\"");
					responseStr.append("}");
				}
			}
			else if (commandStr.equals("sendResponse"))
			{
				if (commandControl.canPlay)
					WebRTCCommands.sendResponse(vhost, commandRequest, commandResponse);
				else
				{
					responseStr.append("{");
					responseStr.append("\"status\":"+WebRTCCommands.STATUS_REQUESTED_DENIED+",");
					responseStr.append("\"statusDescription\":\""+"Request denied"+"\"");
					responseStr.append("}");
				}
			}
			else if (commandStr.equals("getOffer"))
			{
				if (commandControl.canPlay)
					WebRTCCommands.getOffer(vhost, commandRequest, commandResponse);
				else
				{
					responseStr.append("{");
					responseStr.append("\"status\":"+WebRTCCommands.STATUS_REQUESTED_DENIED+",");
					responseStr.append("\"statusDescription\":\""+"Request denied"+"\"");
					responseStr.append("}");
				}
			}
			else if (commandStr.equals("getAvailableStreams"))
			{
				if (commandControl.canQuery)
					WebRTCCommands.getAvailableStreams(vhost, commandRequest, commandResponse);
				else
				{
					didCommand = false;
					WMSLoggerFactory.getLogger(CLASS).warn(CLASSNAME+".onHTTPRequest: Missing command: "+commandStr);
				}
			}
			
			if (didCommand)
				responseStr.append(commandResponse.toJSON());
		}

		if (responseStr.length() <= 0)
		{
			responseStr.append("{");
			responseStr.append("\"status\":"+WebRTCCommands.STATUS_APPLICATION_FAILURE+",");
			responseStr.append("\"statusDescription\":\""+"Application Failure"+"\"");
			responseStr.append("}");
		}
		
		return responseStr.toString();
	}

	public void onHTTPRequest(IVHost vhost, IHTTPRequest req, IHTTPResponse resp)
	{
		if (!doHTTPAuthentication(vhost, req, resp))
			return;
				
        if (req.isUpgradeRequest())
		{
			// it this an websocket upgrade request
			String upgradeType = req.getHeader("upgrade");
			if (upgradeType != null && upgradeType.equalsIgnoreCase(IWebSocketSession.HTTPHEADER_NAME))
			{
				// set response header to accept the upgrade
				resp.setHeader("Upgrade", IWebSocketSession.HTTPHEADER_NAME);
				resp.setHeader("Connection", "Upgrade");
				
				// set the security hash
				String webSocketKey = req.getHeader(IWebSocketSession.HTTPHEADER_SECKEY);
				if (webSocketKey != null)
				{
					String digestStr = WebSocketUtils.createSecResponse(webSocketKey);
					if (digestStr != null)
						resp.setHeader(IWebSocketSession.HTTPHEADER_SECACCEPT, digestStr);
				}
				
				// set 101 response code to accept upgrade request
				resp.setResponseCode(101);
				
				// insert WebSocket listener for this session
				resp.setUpgradeRequestProtocol(IHTTPResponse.UPGRADE_PROTOCOL_WEBSOCKETS, new MyWebSocketListener(vhost));
			}
			else
				resp.setResponseCode(404); // return 404 if not websocket upgrade request
		}
		else
		{
			resp.setResponseCode(403); // forbidden
		}
	}
}
