define(
    'antie/devices/mediaplayer/magine_orsay',
    [
        'antie/devices/device',
        'antie/devices/mediaplayer/mediaplayer',
        'antie/runtimecontext'
    ],
    function(Device, MediaPlayer, RuntimeContext) {
        'use strict';

        /**
         * @name antie.devices.mediaplayer.SamsungMaple
         * @class
         * @extends antie.devices.mediaplayer.MediaPlayer
         */
        var Player = MediaPlayer.extend({

            init: function() {
                this._super();
                this._state = MediaPlayer.STATE.EMPTY;
                this._playerPlugin = document.getElementById('playerPlugin');
                this._deferSeekingTo = null;
                this._postBufferingState = null;
                this._tryingToPause = false;
                this._currentTimeKnown = false;
                this._drmConfigured = false;
                alert("######### MAGINE ORSAY INIT ###########");
            },

            /**
             * @inheritDoc
             */
            setSource: function (mediaType, url, mimeType) {
                if (this.getState() === MediaPlayer.STATE.EMPTY) {
                    this._type = mediaType;
                    this._source = url;
                    this._mimeType = mimeType;

                    this._prepare();
                } else {
                    this._toError('Cannot set source unless in the \'' + MediaPlayer.STATE.EMPTY + '\' state');
                }
            },

            /**
             * @inheritDoc
             */
            resume : function () {
                this._postBufferingState = MediaPlayer.STATE.PLAYING;
                switch (this.getState()) {
                case MediaPlayer.STATE.PLAYING:
                    break;

                case MediaPlayer.STATE.BUFFERING:
                    if (this._tryingToPause) {
                        this._tryingToPause = false;
                        this._sendMessage(Command.PLAY);
                        this._toPlaying();
                    }
                    break;

                case MediaPlayer.STATE.PAUSED:
                    this._sendMessage(Command.PLAY);
                    this._toPlaying();
                    break;

                default:
                    this._toError('Cannot resume while in the \'' + this.getState() + '\' state');
                    break;
                }
            },

            /**
             * @inheritDoc
             */
            playFrom: function (seconds) {
                this._postBufferingState = MediaPlayer.STATE.PLAYING;
                var seekingTo = this.getSeekableRange() ? this._getClampedTimeForPlayFrom(seconds) : seconds;

                switch (this.getState()) {
                case MediaPlayer.STATE.BUFFERING:
                    this._deferSeekingTo = seekingTo;
                    break;

                case MediaPlayer.STATE.PLAYING:
                    this._toBuffering();
                    if (!this._currentTimeKnown) {
                        this._deferSeekingTo = seekingTo;
                    } else if (this._isNearToCurrentTime(seekingTo)) {
                        this._toPlaying();
                    } else {
                        this._seekToPosition(seekingTo);
                    }
                    break;


                case MediaPlayer.STATE.PAUSED:
                    this._toBuffering();
                    if (!this._currentTimeKnown) {
                        this._deferSeekingTo = seekingTo;
                    } else if (this._isNearToCurrentTime(seekingTo)) {
                        this._sendMessage(Command.PLAY);
                        this._toPlaying();
                    } else {
                        this._seekToPosition(seekingTo);
                        this._sendMessage(Command.PLAY);
                        this._toPlaying();
                    }
                    break;

                case MediaPlayer.STATE.COMPLETE:
                    this._sendMessage(Command.STOP);
                    // this._setDisplayFullScreenForVideo();
                    this._seekToPosition(seekingTo);
                    this._sendMessage(Command.PLAY);
                    this._toPlaying();
                    break;

                default:
                    this._toError('Cannot playFrom while in the \'' + this.getState() + '\' state');
                    break;
                }
            },

            /**
             * @inheritDoc
             */
            beginPlayback: function() {
                this._postBufferingState = MediaPlayer.STATE.PLAYING;
                switch (this.getState()) {
                    case MediaPlayer.STATE.STOPPED:
                        this._setDisplayFullScreenForVideo();
                        this._sendMessage(Command.PLAY);
                        this._toPlaying();
                        break;

                    default:
                        this._toError('Cannot beginPlayback while in the \'' + this.getState() + '\' state');
                        break;
                }
            },

            /**
             * @inheritDoc
             */
            beginPlaybackFrom: function(seconds) {
                this._postBufferingState = MediaPlayer.STATE.PLAYING;
                var seekingTo = this.getSeekableRange() ? this._getClampedTimeForPlayFrom(seconds) : seconds;

                switch (this.getState()) {
                    case MediaPlayer.STATE.STOPPED:
                        this._setDisplayFullScreenForVideo();
                        this._seekToPosition(seekingTo);
                        this._sendMessage(Command.PLAY);
                        break;

                    default:
                        this._toError('Cannot beginPlayback while in the \'' + this.getState() + '\' state');
                        break;
                }
            },

            /**
             * @inheritDoc
             */
            pause: function () {
                this._postBufferingState = MediaPlayer.STATE.PAUSED;
                switch (this.getState()) {
                    case MediaPlayer.STATE.BUFFERING:
                    case MediaPlayer.STATE.PAUSED:
                        this.resume();
                        break;

                    case MediaPlayer.STATE.PLAYING:
                        this._sendMessage(Command.PAUSE);
                        this._toPaused();
                        break;

                    default:
                        this._toError('Cannot pause while in the \'' + this.getState() + '\' state');
                        break;
                }
            },

            /**
             * @inheritDoc
             */
            stop: function () {
                switch (this.getState()) {
                    case MediaPlayer.STATE.STOPPED:
                        break;

                    case MediaPlayer.STATE.BUFFERING:
                    case MediaPlayer.STATE.PLAYING:
                    case MediaPlayer.STATE.PAUSED:
                    case MediaPlayer.STATE.COMPLETE:
                        this._stopPlayer();
                        this._toStopped();
                        break;

                    default:
                        this._toError('Cannot stop while in the \'' + this.getState() + '\' state');
                        break;
                }
            },

            /**
             * @inheritDoc
             */
            reset: function () {
                switch (this.getState()) {
                    case MediaPlayer.STATE.EMPTY:
                        break;

                    case MediaPlayer.STATE.STOPPED:
                    case MediaPlayer.STATE.ERROR:
                        this._toEmpty();
                        break;

                    default:
                        this._toError('Cannot reset while in the \'' + this.getState() + '\' state');
                        break;
                    }
            },

            /**
             * @inheritDoc
             */
            getSource: function () {
                return this._source;
            },

            /**
             * @inheritDoc
             */
            getMimeType: function () {
                return this._mimeType;
            },

            /**
             * @inheritDoc
             */
            getCurrentTime: function () {
              alert("getCurrentTime FUNCTION!!!!!! ");
              return 0;
              // var time;
              // try {
              //   time = this._sendMessage(Command.GETCURRENTTIME) / 1000;
              //   alert("getCurrentTime returned " + time);
              //   return time;
              // } catch (e) {
              //   alert("getCurrentTime ERROR " + e);
              // }
            },

            /**
             * @inheritDoc
             */
             getSeekableRange: function() {
                 return this._getSeekableRange();
             },

             _getSeekableRange: function() {
                return {
                 start: 0,
                 end: this._getMediaDuration()
                };
             },

            /**
             * @inheritDoc
             */
            _getMediaDuration: function() {
                //return this._player.getDuration() / 1000;
                return 0;
            },

            /**
             * @inheritDoc
             */
            getState: function () {
                return this._state;
            },

            /**
             * @inheritDoc
             */
            getPlayerElement: function() {
                return this._playerPlugin;
            },

            setDRMParams: function(license_url, custom_data) {

                alert("setDRMParams license_url= "+ license_url + "custom_data= " + custom_data );
                this._drmOpt = {
                    drm : {
                        type : "Playready",
                        company : 'Microsoft Corporation',
                        deviceID : '1'
                    }
                };

                this._prepare();

                if (license_url !== '' && license_url !== undefined) {
                  var params = [ drmData.ADD_LICENSE, license_url, license_url.length ];
                  this._sendMessage(Command.SETDRM, params);
                }
                if (custom_data !== '' && custom_data !== undefined) {
                    var data = JSON.stringify(custom_data);
                    var preparedCustomData = btoa(data);
                    var params = [ drmData.CUSTOM_DATA, preparedCustomData, preparedCustomData.length ];
                    this._sendMessage(Command.SETDRM, params);
                }

                this._drmConfigured = true;
            },

            getSubtitleTracks: function() {
                // TODO define a format to return
                var totalTracks = webapis.avplay.getTotalTrackInfo();
                var currentTracks = webapis.avplay.getCurrentStreamInfo();

                return {
                    subtitleTracks: totalTracks,
                    currentSubtitleTrack: currentTracks
                };
            },

            _prepare: function() {
                this._sendMessage(Command.OPEN, this._source, this._drmOpt);
                // this._sendMessage(Command.SETLISTENERS);
                var dimensions = RuntimeContext.getDevice().getScreenSize();

                var params = [ 0, 0, dimensions.width, dimensions.height ];

                this._sendMessage(Command.SETDISPLAYRECT, params);
                this._toStopped();
            },

            _createListener: function() {
                self = this;
                if (!this._listener) {
                    this._listener = {
                        onbufferingstart: function() {
                            self._onDeviceBuffering();
                        },
                        onbufferingprogress: function(percent) {
                            console.log("Buffering progress. " + percent);
                        },
                        onevent: function(eventType, eventData) {
                            console.log("event: " + eventType + ", data: " + eventData);
                        },
                        onerror: function(eventType) {
                            self._onDeviceError("event type error : " + eventType);
                        },
                        onbufferingcomplete: function() {
                            console.log("onbufferingcomplete");
                            self._onFinishedBuffering();
                        },
                        onstreamcompleted: function() {
                            console.log("onstreamcompleted");
                            self._onEndOfMedia();
                        },
                        oncurrentplaytime: function(currentTime) {
                            console.log("Current Playtime : " + currentTime);
                            self._onCurrentTime(currentTime);
                        },
                        ondrmevent: function(drmEvent, drmData) {
                            console.log("DRM callback: " + drmEvent + ", data: " + drmData);
                        },
                        onsubtitlechange: function(duration, text, type, attriCount, attributes) {
                            console.log("subtitle changed");
                    	    document.getElementById("subtitleArea").innerHTML = text;
                    	}
                    };
                }

                return this._listener;
            },

            _onFinishedBuffering: function() {
                if (this.getState() !== MediaPlayer.STATE.BUFFERING) {
                    return;
                }

                if (this._deferSeekingTo === null) {
                    if (this._postBufferingState === MediaPlayer.STATE.PAUSED) {
                        this._tryPauseWithStateTransition();
                    } else {
                        this._sendMessage(Command.PLAY);
                        this._toPlaying();
                    }
                }
            },

            _onDeviceError: function(message) {
                this._reportError(message);
            },

            _onDeviceBuffering: function() {
                if (this.getState() === MediaPlayer.STATE.PLAYING) {
                    this._toBuffering();
                }
            },

            _onEndOfMedia: function() {
                this._toComplete();
            },

            _stopPlayer: function() {
                this._sendMessage(Command.STOP);
                this._currentTimeKnown = false;
            },

            _tryPauseWithStateTransition: function() {
                this._sendMessage(Command.PAUSE);
                this._toPaused();
                this._tryingToPause = false;
            },

            _onStatus: function() {
                var state = this.getState();
                if (state === MediaPlayer.STATE.PLAYING) {
                    this._emitEvent(MediaPlayer.EVENT.STATUS);
                }
            },

            _onCurrentTime: function(timeInMillis) {
                this._currentTime = timeInMillis / 1000;
                this._onStatus();
                this._currentTimeKnown = true;

                if (this._deferSeekingTo !== null) {
                    this._deferredSeek();
                }

                if (this._tryingToPause) {
                    this._tryPauseWithStateTransition();
                }
            },

            _deferredSeek: function() {
                var clampedTime = this._getClampedTimeForPlayFrom(this._deferSeekingTo);
                var isNearCurrentTime = this._isNearToCurrentTime(clampedTime);

                if (isNearCurrentTime) {
                    this._toPlaying();
                    this._deferSeekingTo = null;
                } else {
                    this._seekToPosition(clampedTime);
                    this._deferSeekingTo = null;
                }
            },

            _getClampedTimeForPlayFrom: function (seconds) {
                var clampedTime = this._getClampedTime(seconds);
                return clampedTime;
            },

            _wipe: function () {
                this._stopPlayer();
                this._type = undefined;
                this._source = undefined;
                this._mimeType = undefined;
                this._currentTime = undefined;
                this._deferSeekingTo = null;
                this._tryingToPause = false;
                this._currentTimeKnown = false;
                this._drmConfigured = false;
                this._drmOpt = undefined;
                this._sendMessage(Command.RESET);
            },

            _seekToPosition: function(seconds) {
                var self = this;
                this._sendMessage(Command.SEEKTO, seconds * 1000);
            },

            _reportError: function(errorMessage) {
                RuntimeContext.getDevice().getLogger().error(errorMessage);
                this._emitEvent(MediaPlayer.EVENT.ERROR, {'errorMessage': errorMessage});
            },

            _toStopped: function () {
                this._currentTime = 0;
                this._state = MediaPlayer.STATE.STOPPED;
                this._emitEvent(MediaPlayer.EVENT.STOPPED);
            },

            _toBuffering: function () {
                this._state = MediaPlayer.STATE.BUFFERING;
                this._emitEvent(MediaPlayer.EVENT.BUFFERING);
            },

            _toPlaying: function () {
                this._state = MediaPlayer.STATE.PLAYING;
                this._emitEvent(MediaPlayer.EVENT.PLAYING);
            },

            _toPaused: function () {
                this._state = MediaPlayer.STATE.PAUSED;
                this._emitEvent(MediaPlayer.EVENT.PAUSED);
            },

            _toComplete: function () {
                this._state = MediaPlayer.STATE.COMPLETE;
                this._emitEvent(MediaPlayer.EVENT.COMPLETE);
            },

            _toEmpty: function () {
                this._wipe();
                this._state = MediaPlayer.STATE.EMPTY;
            },

            _toError: function(errorMessage) {
                this._wipe();
                this._state = MediaPlayer.STATE.ERROR;
                this._reportError(errorMessage);
                alert(">>>>>>>>>>> _toError: " + errorMessage);
                throw 'ApiError: ' + errorMessage;
            },

            _setDisplayFullScreenForVideo: function() {
                var dimensions = RuntimeContext.getDevice().getScreenSize();
                var params = [ 0, 0, dimensions.width, dimensions.height ];
                this._sendMessage(Command.SETDISPLAYRECT, params);
            },

            _sendMessage: function(command, extraParam) {
                if (typeof extraParam === "undefined")
                    extraParam = '';

                window.postMessage({
                  type: 'command', action: command, extraParam: extraParam }, '*');
            },

            /**
             * @constant {Number} Time (in seconds) compared to current time within which seeking has no effect.
             * On a sample device (Samsung FoxP 2013), seeking by two seconds worked 90% of the time, but seeking
             * by 2.5 seconds was always seen to work.
             */
            CURRENT_TIME_TOLERANCE: 2.5
        });

        var Command = {
            PLAY : 'play',
            STOP : 'stop',
            PAUSE : 'pause',
            GETCURRENTTIME : 'get_current_time',
            GETDURATION : 'get_duration',
            SETDRM : 'set_drm',
            RESET : 'reset',
            OPEN : 'open',
            SETDISPLAYRECT: 'set_display_rect',
            SEEKTO: 'seek_to'
        };

        var drmData = {
            CUSTOM_DATA: 3,
            ADD_LICENSE: 4,
            DEL_LICENSE: 6
        };

        var instance = new Player();

        // Mixin this MediaPlayer implementation, so that device.getMediaPlayer() returns the correct implementation for the device
        Device.prototype.getMediaPlayer = function() {
            alert("######### MAGINE ORSAY getMediaPlayer ###########");
            return instance;
        };

        return Player;
    }

);
