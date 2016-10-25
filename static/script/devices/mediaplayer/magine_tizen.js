define(
    'antie/devices/mediaplayer/magine_tizen',
    [
        'antie/devices/device',
        'antie/devices/mediaplayer/mediaplayer',
        'antie/runtimecontext'
    ],
    function(Device, MediaPlayer, RuntimeContext) {
        'use strict';

        var Player = MediaPlayer.extend({

            init: function() {
                console.log("init player");
                this._super();
                this._state = MediaPlayer.STATE.EMPTY;
                this._playerPlugin = document.getElementById('player-element');
                this._deferSeekingTo = null;
                this._postBufferingState = null;
                this._tryingToPause = false;
                this._currentTimeKnown = false;
                this._drmConfigured = false;
                this._suspended = false;

                this._player = webapis.avplay;
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
                        this._player.play();
                        this._toPlaying();
                    }
                    break;

                case MediaPlayer.STATE.PAUSED:
                    this._player.play();
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
                        this._player.play();
                        this._toPlaying();
                    } else {
                        this._seekToPosition(seekingTo);
                        this._player.play();
                        this._toPlaying();
                    }
                    break;

                case MediaPlayer.STATE.COMPLETE:
                    this._player.stop();
                    this._setDisplayFullScreenForVideo();
                    this._seekToPosition(seekingTo);
                    this._player.play();
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
                        this._player.play();
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
                        this._player.play();
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
                        this._player.pause();
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
                return this._player.getCurrentTime() / 1000;
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
                return this._player.getDuration() / 1000;
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
                return this._player;
            },

            setDRMParams: function(license_url, custom_data) {
                console.log("setDRMParams");
                this._drmParam = {
                    DeleteLicenseAfterUse: true
                };

                if (license_url !== '' && license_url !== undefined) {
                    this._drmParam.LicenseServer = license_url;
                }

                if (custom_data !== '' && custom_data !== undefined) {
                    var data = JSON.stringify(custom_data);
                    this._drmParam.CustomData = btoa(data);
                }

                this._player.setDrm("PLAYREADY", "SetProperties", JSON.stringify(this._drmParam));
                this._drmConfigured = true;
                this._player.prepare();
            },

            getSubtitleTracks: function() {
                var subtitleTracks = this._getSubtitleInfo(this._player.getTotalTrackInfo());
                var currentSubtitleTrack = this._getSubtitleInfo(this._player.getCurrentStreamInfo());

                return {
                    subtitleTracks: subtitleTracks,
                    currentSubtitleTrack: currentSubtitleTrack
                };
            },

            setSubtitleTrack: function (subtitleTrack) {
                var mediaList = this._player.getTotalTrackInfo();

                for (var i = 0; i < mediaList.length; i++) {
                     if (mediaList[i].type == "TEXT") {
                         var extraParam  = JSON.parse(mediaList[i].extra_info);
                         if (extraParam.track_lang == subtitleTrack) {
                             console.log("setting to: " + subtitleTrack + " index: " + mediaList[i].index);
                             this._player.setSelectTrack("TEXT", mediaList[i].index);
                             break;
                         }
                     }
                }
            },

            getAudioTracks: function () {
                return this._getAudioInfo(this._player.getTotalTrackInfo());
            },

            setAudioTrack: function (audioTrack) {
                this._player.setSelectTrack("AUDIO", audioTrack);
            },

            suspendPlayer: function () {
                this._player.suspend();
                this._suspended = true;
            },

            restorePlayer: function () {
                this._player.restore(this._source, this._currentTime, false);
                this._player.setDrm("PLAYREADY", "SetProperties", JSON.stringify(this._drmParam));
                this._player.prepare();

                this._suspended = false;
            },

            _prepare: function() {
                this._player.open(this._source);
                this._player.setListener(this._createListener());

                if (this._playerPlugin !== null && this._playerPlugin !== undefined) {
                    this._player.setDisplayRect(
                        this._playerPlugin.offsetLeft, this._playerPlugin.offsetTop,
                        this._playerPlugin.offsetWidth, this._playerPlugin.offsetHeight
                    );
                } else {
                    var dimensions = RuntimeContext.getDevice().getScreenSize();
                    this._player.setDisplayRect(0, 0, dimensions.width, dimensions.height );
                }

                this._player.setDisplayMethod('PLAYER_DISPLAY_MODE_FULL_SCREEN');
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
                            console.log("subtitle changed: " + text);
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
                        this._toPlaying();
                        this._player.play();
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
                this._player.stop();
                this._currentTimeKnown = false;
            },

            _tryPauseWithStateTransition: function() {
                console.log("_deferredSeek");
                this._player.pause();
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
                console.log("_deferredSeek");
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

            _getSubtitleInfo: function (mediaList) {
                var totalTracksArray = [];

                for (var i = 0; i < mediaList.length; i++) {
                     if (mediaList[i].type == "TEXT") {
                         var extraParam  = JSON.parse(mediaList[i].extra_info);
                         totalTracksArray.push(extraParam.track_lang);
                     }
                }
                return totalTracksArray;
            },

            _getAudioInfo: function (mediaList) {
                var totalTracksArray = [];

                for (var i = 0; i < mediaList.length; i++) {
                     if (mediaList[i].type == "AUDIO") {
                         var extraParam  = JSON.parse(test[i].extra_info);
                         totalTracksArray.push(extraParam.language);
                     }
                }
                return totalTracksArray;
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
                this._player.stop();
            },

            _seekToPosition: function(seconds) {
                var self = this;
                this._player.seekTo(seconds * 1000);
            },

            _reportError: function(errorMessage) {
                RuntimeContext.getDevice().getLogger().error(errorMessage);
                this._emitEvent(MediaPlayer.EVENT.ERROR, {'errorMessage': errorMessage});
            },

            _toStopped: function () {
                console.log("_toStopped");
                this._currentTime = 0;
                this._state = MediaPlayer.STATE.STOPPED;
                this._emitEvent(MediaPlayer.EVENT.STOPPED);
            },

            _toBuffering: function () {
                console.log("_toBuffering");
                this._state = MediaPlayer.STATE.BUFFERING;
                this._emitEvent(MediaPlayer.EVENT.BUFFERING);
            },

            _toPlaying: function () {
                console.log("_toPlaying");
                this._state = MediaPlayer.STATE.PLAYING;
                this._emitEvent(MediaPlayer.EVENT.PLAYING);
            },

            _toPaused: function () {
                console.log("_toPaused");
                this._state = MediaPlayer.STATE.PAUSED;
                this._emitEvent(MediaPlayer.EVENT.PAUSED);
            },

            _toComplete: function () {
                console.log("_toComplete");
                this._state = MediaPlayer.STATE.COMPLETE;
                this._emitEvent(MediaPlayer.EVENT.COMPLETE);
            },

            _toEmpty: function () {
                console.log("_toEmpty");
                this._wipe();
                this._state = MediaPlayer.STATE.EMPTY;
            },

            _toError: function(errorMessage) {
                console.log("_toError " + errorMessage);
                this._wipe();
                this._state = MediaPlayer.STATE.ERROR;
                this._reportError(errorMessage);
                throw 'ApiError: ' + errorMessage;
            },

            _setDisplayFullScreenForVideo: function() {
                var dimensions = RuntimeContext.getDevice().getScreenSize();
                this._player.setDisplayRect(0, 0, dimensions.width, dimensions.height);
                this._player.setDisplayMethod('PLAYER_DISPLAY_MODE_FULL_SCREEN');
            },

            CURRENT_TIME_TOLERANCE: 2.5
        });

        var MediaTrackType = {
            AUDIO: "AUDIO",
            SUBTITLE: "TEXT"
        }

        var instance = null;

       // Mixin this MediaPlayer implementation, so that device.getMediaPlayer() returns the correct implementation for the device
       Device.prototype.getMediaPlayer = function() {
           if (!instance) {
               instance = new Player();
           }

           return instance;
       };

        return Player;
    }

);
