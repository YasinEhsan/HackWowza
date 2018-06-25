const ICE_SERVERS = {'iceServers': []};
const SERVER_URL = "wss://localhost.streamlock.net/webrtc-session.json";
const WOWZA_APPLICATION_NAME = "webrtc";
const WOWZA_STREAM_NAME = "myStream";
const WOWZA_SESSION_ID_EMPTY = "[empty]";

const GO_BUTTON_JOIN = "Join Chat";
const GO_BUTTON_LEAVE = "Leave Chat";

const STATUS_OK = 200;
const STATUS_APPLICATION_FAILURE = 500;
const STATUS_ERROR_STARTING_APPLICATION = 501;
const STATUS_ERROR_STREAM_NOT_RUNNING = 502;
const STATUS_STREAMNAME_INUSE = 503;
const STATUS_STREAM_NOT_READY = 504;
const STATUS_ERROR_CREATE_SDP_OFFER = 505;
const STATUS_ERROR_CREATING_RTP_STREAM = 506;
const STATUS_WEBRTC_SESSION_NOT_FOUND = 507;
const STATUS_ERROR_DECODING_SDP_DATA = 508;
const STATUS_ERROR_SESSIONID_NOT_SPECIFIED = 509;

const CODEC_AUDIO_UNKNOWN = -1;
const CODEC_AUDIO_PCM_BE = 0x00;
const CODEC_AUDIO_PCM_SWF = 0x01;
const CODEC_AUDIO_AC3 = 0x01; //TODO steal this slot
const CODEC_AUDIO_MP3 = 0x02;
const CODEC_AUDIO_PCM_LE = 0x03;
const CODEC_AUDIO_NELLYMOSER_16MONO = 0x04;
const CODEC_AUDIO_NELLYMOSER_8MONO = 0x05;
const CODEC_AUDIO_NELLYMOSER = 0x06;
const CODEC_AUDIO_G711_ALAW = 0x07;
const CODEC_AUDIO_G711_MULAW = 0x08;
const CODEC_AUDIO_RESERVED = 0x09;
const CODEC_AUDIO_VORBIS = 0x09; //TODO steal this slot
const CODEC_AUDIO_AAC = 0x0a;
const CODEC_AUDIO_SPEEX = 0x0b;
const CODEC_AUDIO_OPUS = 0x0c;
const CODEC_AUDIO_MP3_8 = 0x0f;

const CODEC_VIDEO_UNKNOWN = -1;
const CODEC_VIDEO_SPARK = 0x02;
const CODEC_VIDEO_SCREEN = 0x03;
const CODEC_VIDEO_VP6 = 0x04;
const CODEC_VIDEO_VP6A = 0x05;
const CODEC_VIDEO_SCREEN2 = 0x06;
const CODEC_VIDEO_H264 = 0x07;
const CODEC_VIDEO_VPX = 0x08;
const CODEC_VIDEO_VP8 = 0x08; // CODEC_VIDEO_VPX used to be CODEC_VIDEO_VP8 - kept old constant for compatiblility
const CODEC_VIDEO_H263 = 0x09;
const CODEC_VIDEO_MPEG4 = 0x0a;
const CODEC_VIDEO_MPEG2 = 0x0b;
const CODEC_VIDEO_H265 = 0x0c;

navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
