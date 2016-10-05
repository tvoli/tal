define(
    'antie/devices/mediaplayer/magine_ps4',
    [
        'antie/devices/device',
        'antie/devices/mediaplayer/mediaplayer',
        'antie/devices/mediaplayer/webmafapi',
        "antie/runtimecontext"
    ],
    function (Device, MediaPlayer, PS4PlayerAPI, RuntimeContext) {
        'use strict';
        var Player = MediaPlayer.extend({
            init: function () {
                try {
                this._super();
                var self = this;
                this._player = new PS4PlayerAPI();
                this._state = MediaPlayer.STATE.EMPTY;
                // RuntimeContext.getDevice().getLogger().warn('magine_ps4.init()', JSON.stringify(this._player));
                window.mediaplayer = this;
                window.accessfunction = function (json) {
                    var event = new CustomEvent('playerResponses', {detail:json});
                    window.dispatchEvent(event);
                    document.getElementById("debug-area").innerHTML += '<br/>' + json;
                }
                window.addEventListener('playerResponses', this._onPlayerResponse, false);
                } catch (e) {
                    RuntimeContext.getDevice().getLogger().warn("--> WebMAF API error:" + e);
                }
            },

            _onPlayerResponse: function (data) {
              var self = window.mediaplayer;
              // RuntimeContext.getDevice().getLogger().warn("Response " + data.detail + this);
              var result = JSON.parse(data.detail);
              // RuntimeContext.getDevice().getLogger().warn("result: " + result.playerState);
              switch(result.command) {
                  case "getAudioTracks":
                      //update_audio_languages_display(data.audioTracks);
                      break;

                  case "getSubtitleTracks":
                      //update_subtitle_languages_display(data.subtitleTracks);
                      break;

                  case "getPlaybackTime":
                      self._onCurrentTime(result);
                      break;

                  case "networkStatusChange":
                      break;

                  case "contentAvailable":
                      break;

                  case "playerSubtitle":
                      break;

                  case "playerStatusChange":
                      // RuntimeContext.getDevice().getLogger().warn("playerStatusChange: " + result.playerState);
                      //RuntimeContext.getDevice().getLogger().warn("current state: " + this._state);

                      try {
                      switch(result.playerState) {
                          case "notReady":
                              self._toEmpty();
                              // RuntimeContext.getDevice().getLogger().warn(" switch notReady: ");
                              break;

                          case "opening":
                          case "buffering":
                              // RuntimeContext.getDevice().getLogger().warn("switch opening|buffering: ");
                              self._toBuffering();
                              break;

                          case "playing":
                          case "DisplayingVideo":
                              self._toPlaying();
                              // RuntimeContext.getDevice().getLogger().warn(" switch playing|DisplayingVideo: ");
                              break;

                          case "stopped":
                              // RuntimeContext.getDevice().getLogger().warn("switch stopped: ");
                              self._toStopped();
                              break;

                          case "paused":
                              // RuntimeContext.getDevice().getLogger().warn("switch paused: ");
                              self._toPaused();
                              break;

                          case "endOfStream":
                              // RuntimeContext.getDevice().getLogger().warn("switch notReady: ");
                              self._toComplete();
                              break;

                          case "unknown":
                          default:
                              // RuntimeContext.getDevice().getLogger().warn("switch unknown: ");
                              self._reportError();
                              break;
                      }
                      break;
                    } catch (e) {
                        RuntimeContext.getDevice().getLogger().warn("ERROR:" + e);
                    }
              }
            },

            /**
             * @inheritDoc
             */
            setSource: function (mediaType, url, mimeType) {
                if (this.getState() === MediaPlayer.STATE.EMPTY) {
                    this._type = mediaType;
                    this._source = url;
                    this._mimeType = mimeType;
                    //this._toStopped();
                } else {
                    this._toError('Cannot set source unless in the \'' + MediaPlayer.STATE.EMPTY + '\' state');
                }
            },
            /* source type video options
            0= Unknown
            1= Standard MP4 file (can be local or remote)
            2= Smooth Streaming
            4= Dash MP4
            6= Dash MPEG2 Transport Stream
            8= Http Live Streaming
            9= MPEG2 Transport Stream file (can be local or remote)
            */

            setDRMParams: function (url, license, custom_data, sourceType) {
              this._source = url;
              this._license = license;
              this._customData = custom_data;
              this._sourceType = sourceType;
              this.video_API_load(this._source,
                                          this._license,
                                          this._customData,
                                          this._sourceType);

            },

            getDRMParams: function () {
              return;
            },

            /**
             * @inheritDoc
             */
            resume : function () {
                // RuntimeContext.getDevice().getLogger().warn("resume: getState = " + this.getState());
                switch (this.getState()) {
                    case MediaPlayer.STATE.PAUSED:
                    case MediaPlayer.STATE.STOPPED:
                        this.playFrom(this.getCurrentTime());
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
                if(!seconds) {
                  return;
                }
                // RuntimeContext.getDevice().getLogger().warn("playFrom: " + this.getState());
                switch (this.getState()) {
                    case MediaPlayer.STATE.BUFFERING:
                    case MediaPlayer.STATE.PLAYING:
                    case MediaPlayer.STATE.COMPLETE:
                        this.video_API_stop();
                        this.video_API_setplaytime(seconds);
                        this.play();
                        break;

                    case MediaPlayer.STATE.PAUSED:
                        this.video_API_setplaytime(seconds);
                        this.play();
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
                    this.play();
                    break;
                case MediaPlayer.STATE.PAUSED:
                    // RuntimeContext.getDevice().getLogger().warn("beginPlayback:" );
                    this.resume();
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
                    case MediaPlayer.STATE.COMPLETE:
                        this.video_API_setplaytime(seconds);
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
                // RuntimeContext.getDevice().getLogger().warn("--> WebMAF API PAUSE " + this._state);
                this._postBufferingState = MediaPlayer.STATE.PAUSED;
                switch (this.getState()) {
                case MediaPlayer.STATE.BUFFERING:
                    // RuntimeContext.getDevice().getLogger().warn("--> WebMAF API PAUSE MediaPlayer.STATE.BUFFERING");
                    break;
                case MediaPlayer.STATE.PAUSED:
                    // RuntimeContext.getDevice().getLogger().warn("--> WebMAF API PAUSE MediaPlayer.STATE.PAUSED");
                    break;

                case MediaPlayer.STATE.PLAYING:
                    // RuntimeContext.getDevice().getLogger().warn("--> WebMAF API PAUSE MediaPlayer.STATE.PLAYING");
                    this.video_API_pause();
                    this.video_API_asynchronous_get_playtime();
                    break;

                default:
                    RuntimeContext.getDevice().getLogger().warn("'Cannot pause while in the \'' + this.getState() + '\' state'");
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
                if (this._currentTime) {
                    return this._currentTime;
                }
                return undefined;
            },

            /**
             * @inheritDoc
             */
            getSeekableRange: function () {
                return this._range;
            },

            /**
             * @inheritDoc
             */
            _getMediaDuration: function() {
                if (this._range) {
                    return this._range.end;
                }
                return undefined;
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

            _onDeviceError: function(message) {
                this._reportError(message);
            },

            _stopPlayer: function() {
                this._playerPlugin.Stop();
                this._currentTimeKnown = false;
            },

            _onCurrentTime: function(time) {
                this._currentTime = time.elapsedTime;
            },

            _wipe: function () {
                this._stopPlayer();
                this._type = undefined;
                this._source = undefined;
                this._mimeType = undefined;
                this._currentTime = undefined;
                this._range = undefined;
                this._deferSeekingTo = null;
                this._tryingToPause = false;
                this._currentTimeKnown = false;
            },

            _reportError: function(errorMessage) {
                RuntimeContext.getDevice().getLogger().error(errorMessage);
                this._emitEvent(MediaPlayer.EVENT.ERROR, {'errorMessage': errorMessage});
            },

            _toStopped: function () {
                this._currentTime = 0;
                this._range = undefined;
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
                throw 'ApiError: ' + errorMessage;
            },

            video_API_stop: function() {
              this._player.webmaf_stop()
            },

            video_API_setplaytime: function (play_pos) {
              this._player.webmaf_setplaytime(play_pos);
            },

            video_API_pause: function() {
              this._player.webmaf_pause();
            },

            video_API_play: function() {
              this._player.webmaf_play();
            },

            video_API_load: function(url, licence, custom_data, sourceType) {
              this._player.webmaf_load(url, licence, custom_data, sourceType);
            },

            video_API_asynchronous_get_playtime: function() {
              this._player.webmaf_asynchronous_get_playtime();
            },

            video_API_asynchronous_check_audio_and_timedtext_streams: function() {
              this._player.webmaf_check_audio_and_timedtext_streams();
            },

            video_API_set_audio_language: function() {
              this._player.webmaf_stop();
            },

            video_API_set_subtitle_track: function(track_code) {
              this._player.webmaf_set_subtitle_track(track_code);
            },

            video_API_set_set_audio_track: function(track_code) {
              this._player.webmaf_set_audio_track(track_code);
            },

            video_API_set_video_portal: function(left_top_x,left_top_y,right_bottom_x,right_bottom_y) {
              this._player.webmaf_set_audio_track(left_top_x,left_top_y,right_bottom_x,right_bottom_y);
            },


            play: function () {
                //RuntimeContext.getDevice().getLogger().warn(" webmaf play");
                //console.log('AVPlayer.play()', "Current state: " + webapis.avplay.getState());
        				try {
        					this.video_API_play();
        					//console.log('AVPlayer.play()', "Current state: " + webapis.avplay.getState());
        				} catch (e) {
        					//console.log('AVPlayer.play()', "Current state: " + webapis.avplay.getState());
        					console.log(e);
                  //RuntimeContext.getDevice().getLogger().warn(" webmaf play error" + e);
        				}
            }
        });

        var instance = new Player();

        // Mixin this MediaPlayer implementation, so that device.getMediaPlayer() returns the correct implementation for the device
        Device.prototype.getMediaPlayer = function() {
            return instance;
        };

        return Player;
    }
  );
