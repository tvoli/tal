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
                this._tryingToPause = false;
                this._currentTimeKnown = false;
                this._drmConfigured = false;
                this._player = null;
                this._jumpCondition = JUMP.NONE;
                this._audioTracks = undefined;
                this._audioNumChannels = undefined;
                this._currentAudioTrack = undefined;
            },

            getPlayer: function() {
              try {
                webapis.avplay.getAVPlay(this.onAVPlayObtained.bind(this), this.onAVPlayError.bind(this));
              } catch (e) {
                alert ('error on getting player: ' + e.message);
              }
            },

            onAVPlayObtained: function (avPlayObject) {
                this._player = avPlayObject;
                var self = this;

                var bufferingCB = {
                    onbufferingstart : this._onbufferingstart,
                    onbufferingprogress: this._onbufferingprogress,
                    onbufferingcomplete: this._onbufferingcomplete
                };

                var playCB = {
                    oncurrentplaytime: function(time){self['_oncurrentplaytime'].apply(self, [time])},
                    onresolutionchanged: this._onresolutionchanged,
                    onstreamcompleted: this._onstreamcompleted,
                    onerror: this._toErrorfunction
                };

                this._player.init({ bufferingCallback : bufferingCB,
                                    playCallback : playCB });
            },

            onAVPlayError: function (error) {
                alert('AVPlayer not available. ' + error);
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
                switch (this.getState()) {
                case MediaPlayer.STATE.PLAYING:
                    break;

                case MediaPlayer.STATE.BUFFERING:
                    if (this._tryingToPause) {
                        this._tryingToPause = false;
                        this._play();
                        this._toPlaying();
                    }
                    break;

                case MediaPlayer.STATE.PAUSED:
                    this._play();
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
                switch (this.getState()) {
                case MediaPlayer.STATE.BUFFERING:
                case MediaPlayer.STATE.PLAYING:
                case MediaPlayer.STATE.PAUSED:
                case MediaPlayer.STATE.COMPLETE:
                    this._checkPlayPosition(seconds);
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
                switch (this.getState()) {
                    case MediaPlayer.STATE.STOPPED:
                        this._play();
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
                switch (this.getState()) {
                    case MediaPlayer.STATE.STOPPED:
                        this._play();
                        this._toPlaying();
                        this._jumpCondition = JUMP.FORWARD;
                        this._jumpTime = seconds;
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
                switch (this.getState()) {
                    case MediaPlayer.STATE.BUFFERING:
                    case MediaPlayer.STATE.PAUSED:
                        this.resume();
                        break;

                    case MediaPlayer.STATE.PLAYING:
                        this._pause();
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
                        this._toEmpty();
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
                var timestring = JSON.stringify(this._currentTime);
                var result = JSON.parse(timestring);
                var value = parseInt(result.millisecond / 1000);
                return value;
            },

            /**
             * @inheritDoc
             */
             getSeekableRange: function() {
                 return 0;
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

                if (license_url !== '' && license_url !== undefined) {
                  var params = [ drmData.ADD_LICENSE, license_url, license_url.length ];
                  this._set_drm(params);
                }
                if (custom_data !== '' && custom_data !== undefined) {
                    var data = JSON.stringify(custom_data);
                    var preparedCustomData = btoa(data);
                    var params = [ drmData.CUSTOM_DATA, preparedCustomData, preparedCustomData.length ];
                    this._set_drm(params);
                }

                this._drmConfigured = true;
            },

            getSubtitleTracks: function() {
            },

            setSubtitleTrack: function (subtitleTrack) {
            },

            getAudioTracks: function () {

              var audioParams = {
                  audioTracks: this._audioTracks,
                  audioNumChannels: this._audioNumChannels,
                  currentAudioTrack: this._currentAudioTrack
              };

              return audioParams;
            },

            setAudioTrack: function (audioTrack) {
                if (this._audioTracks > 0) {
                  var track = this._currentAudioTrack + 1;
                  if(track >= this._audioTracks) {
                      this._currentAudioTrack = 0;
                  } else {
                      this._currentAudioTrack = track;
                  }
                  this._player.setAudioStreamID(this._currentAudioTrack);
                }
            },

            _prepare: function() {
                alert('>>> Magine orsay prepare');
                if (this._player === null) {
                    this.getPlayer();
                }

                this._drmOpt = {
                    drm : {
                        type : "Playready",
                        company : 'Microsoft Corporation',
                        deviceID : '1'
                    }
                };

                this._open(this._source, this._drmOpt);

                this._toStopped();
                alert('<<< Magine orsay prepare');
            },

            _stopPlayer: function() {
                alert('stop player');
                this._stop();
                this._currentTimeKnown = false;
            },

            _tryPauseWithStateTransition: function() {
                this._pause();
                this._toPaused();
                this._tryingToPause = false;
            },

            _onStatus: function() {
                var state = this.getState();
                if (state === MediaPlayer.STATE.PLAYING) {
                    this._emitEvent(MediaPlayer.EVENT.STATUS);
                }
            },

            _getClampedTimeForPlayFrom: function (seconds) {
                var clampedTime = this._getClampedTime(seconds);
                return clampedTime;
            },

            _wipe: function () {
                alert('wipe');
                this._stopPlayer();
                this._type = undefined;
                this._source = undefined;
                this._mimeType = undefined;
                this._currentTime = undefined;
                this._tryingToPause = false;
                this._currentTimeKnown = false;
                this._drmConfigured = false;
                this._drmOpt = undefined;
                this._audioTracks = undefined;
                this._currentAudioTrack = undefined;
                this._reset();
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
                alert('_toEmpty');
                this._wipe();
                this._state = MediaPlayer.STATE.EMPTY;
            },

            _toError: function(errorMessage) {
                alert(">>>>>>>>>>> _toError: " + errorMessage);
                this._wipe();
                this._state = MediaPlayer.STATE.ERROR;
                this._reportError(errorMessage);
                throw 'ApiError: ' + errorMessage;
            },

            _setDisplayFullScreenForVideo: function() {
                var dimensions = RuntimeContext.getDevice().getScreenSize();
                var params = [ 0, 0, dimensions.width, dimensions.height ];
                this._set_display_rect(params);
            },

            _play: function(){
                this._player.show();
                this._player.play(function (playSuccessCB) { alert(" playing the video is successfully."); },
                                  function (error) { alert(" Play error = " + error.message); }
                                 );
            },

            _open: function(source, drmParams) {
                if (drmParams !== null) {
                    alert('open source = '+ source + ' drmParams = ' + drmParams + 'this._player = ' + this._player);
                    this._player.open(source, drmParams);
                } else {
                    alert('open source = '+ source + ' this._player = ' + this._player);
                    this._player.open(source);
                }
            },

            _set_drm: function(params) {
                alert('set_drm: ' + params);
                this._player.setPlayerProperty(params[0], params[1], params[2]);
            },

            _stop: function() {
                alert('#####stop');
                this._player.stop();
            },

            _pause: function() {
                alert('pause');
                this._player.pause();
            },

            _reset: function() {
                alert('reset');
                // this._player.reset();
            },

            _set_display_rect: function(rect) {
                alert('set_display_rect ' + rect[0] + rect[1] + rect[2] + rect[3]);
                this._player.setDisplayRect(rect);
            },

            _jumpForward: function (seconds) {
                this._player.jumpForward(seconds);
            },

            _jumpBackward: function (seconds) {
                var value = this.getCurrentTime() - seconds;
                this._player.jumpBackward(value);
            },

            _checkPlayPosition: function (seconds) {
                if (this.getCurrentTime() > seconds) {
                    this._jumpCondition = JUMP.BACKWARD;
                } else {
                    this._jumpCondition = JUMP.FORWARD;
                }
                this._jumpTime = seconds;
            },

            _onbufferingstart: function () {
                alert('buffering started');
                this._toBuffering();
            },

            _onbufferingprogress: function (percent) {
                this._bufferingprogress = percent;
                alert ('on buffering : ' + this._bufferingprogress);
            },

            _onbufferingcomplete: function () {
                alert ('buffering completely');
            },

            _oncurrentplaytime: function (time) {
                this._currentTime = time;

                if (this._jumpCondition === JUMP.FORWARD) {
                    this._jumpForward(this._jumpTime);
                    this._jumpCondition = JUMP.NONE;
                    this._jumpTime = 0;
                } else if (this._jumpCondition === JUMP.BACKWARD) {
                    this._jumpBackward(this._jumpTime);
                    this._jumpCondition = JUMP.NONE;
                    this._jumpTime = 0;
                }
                if (this._audioTracks === undefined &&
                    this._currentAudioTrack === undefined) {
                      this._audioTracks = this._player.totalNumOfAudio;
                      this._currentAudioTrack = 0;
                }
            },

            _onresolutionchanged: function (width, height) {
                this._width = width;
                this._height = height;
                alert ('Resolution changed : ' + this._width + ', ' + this._height);
            },

            _onstreamcompleted: function () {
                alert ('streaming completed');
                this._toComplete();
            },

            _toErrorfunction: function (error) {
                alert ('_toErrorfunction: ' + error.message);
                this._toError(error.message);
            },

            /**
             * @constant {Number} Time (in seconds) compared to current time within which seeking has no effect.
             * On a sample device (Samsung FoxP 2013), seeking by two seconds worked 90% of the time, but seeking
             * by 2.5 seconds was always seen to work.
             */
            CURRENT_TIME_TOLERANCE: 2.5
        });

        var drmData = {
            CUSTOM_DATA: 3,
            ADD_LICENSE: 4,
            DEL_LICENSE: 6
        };

        var JUMP = {
            NONE: 'none',
            FORWARD: 'forward',
            BACKWARD: 'backward'
        };

      var instance = null;

      // Mixin this MediaPlayer implementation, so that device.getMediaPlayer() returns the correct implementation for the device
      Device.prototype.getMediaPlayer = function() {
          if (!instance) {
              instance = new Player();
          }

          return instance;
      };
    }

);
