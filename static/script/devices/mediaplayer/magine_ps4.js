define(
    'antie/devices/mediaplayer/magine_ps4',
    [
        'antie/devices/device',
        'antie/devices/mediaplayer/mediaplayer',
        'antie/devices/mediaplayer/magine_webmafapi',
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
                this._currentTime = undefined;
                this._timePoll = undefined;
                this._pollEnabled = false;
                this._license = undefined;
                this._customData = undefined;
                this._sourceType = undefined;
                this._audioChanged = false;
                this._audioChangedTime = undefined;

                window.mediaplayer = this;
                window.accessfunction = function (json) {
                    var event = new CustomEvent('playerResponses', {detail:json});
                    window.dispatchEvent(event);
                    document.getElementById("debug-area").innerHTML = json + '<br/>' +
                        document.getElementById("debug-area").innerHTML;
                }
                window.addEventListener('playerResponses', this._onPlayerResponse, false);
                } catch (e) {
                    RuntimeContext.getDevice().getLogger().warn("--> WebMAF API error:" + e);
                }
            },

            _onPlayerResponse: function (data) {
              var self = window.mediaplayer;
              // RuntimeContext.getDevice().getLogger().warn("Response: " + data.detail);
              var result = JSON.parse(data.detail);
              // RuntimeContext.getDevice().getLogger().warn("result: " + result);
              switch(result.command) {
                  case "getAudioTracks":
                      self._toSetAudioDetails(result.audioTracks,
                                              result.audioNumChannels,
                                              result.currentAudioTrack);
                      break;

                  case "getSubtitleTracks":
                      self._toSetSubTitleDetais(result.subtitleTracks,
                                                result.currentSubtitleTrack);
                      break;

                  case "getPlaybackTime":
                      self._onCurrentTime(result);
                      break;

                  case "networkStatusChange":
                      break;

                  case "contentAvailable":
                      break;

                  case "playerSubtitle":
                      self._toShowSubtitle(result.textSize, result.text);
                      break;

                  case "playerStatusChange":
                      // RuntimeContext.getDevice().getLogger().warn("playerStatusChange: " + result.playerState);
                      //RuntimeContext.getDevice().getLogger().warn("current state: " + this._state);

                      try {
                      switch(result.playerState) {
                          case "notReady":
                              // RuntimeContext.getDevice().getLogger().warn(" switch notReady: ");
                              self._toEmpty();
                              break;

                          case "opening":
                          case "buffering":
                              // RuntimeContext.getDevice().getLogger().warn("switch opening|buffering: ");
                              self._toBuffering();
                              break;

                          case "playing":
                              self._toPlaying();
                              self._getStreamDetails();
                              // RuntimeContext.getDevice().getLogger().warn(" switch playing|DisplayingVideo: ");
                              break;
                          case "DisplayingVideo":
                              break;

                          case "stopped":
                              //RuntimeContext.getDevice().getLogger().warn("switch stopped: ");
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
                    this._toStopped();
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

            /**
             * @inheritDoc
             */
            setDRMParams: function (license, custom_data, sourceType) {
              this._license = license;
              this._customData = custom_data;
              this._sourceType = sourceType;
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
                    case MediaPlayer.STATE.BUFFERING:
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
                // RuntimeContext.getDevice().getLogger().warn("playFrom: " + seconds + " " + this.getState());
                switch (this.getState()) {
                    case MediaPlayer.STATE.BUFFERING:
                    case MediaPlayer.STATE.PLAYING:
                    case MediaPlayer.STATE.PAUSED:
                    case MediaPlayer.STATE.COMPLETE:
                        this.video_API_setplaytime(seconds);
                        break;

                    case MediaPlayer.STATE.EMPTY:
                    case MediaPlayer.STATE.STOPPED:
                    default:
                        this._toError('Cannot playFrom while in the \'' + this.getState() + '\' state');
                        break;
                }
            },

            /**
             * @inheritDoc
             */
            beginPlayback: function() {
                // RuntimeContext.getDevice().getLogger().warn("beginPlayback:" );
                try {
                    switch (this.getState()) {
                        case MediaPlayer.STATE.STOPPED:
                            this.video_API_load(this._source,
                                                this._license,
                                                this._customData,
                                                this._sourceType);
                            this.video_API_play();
                            break;

                        default:
                            this._toError('Cannot beginPlayback while in the \'' + this.getState() + '\' state');
                            break;
                    }
              } catch (e) {
                  RuntimeContext.getDevice().getLogger().warn();("When tryed to playback got error: " + e);
              }
            },

            /**
             * @inheritDoc
             */
            beginPlaybackFrom: function(seconds) {
              // RuntimeContext.getDevice().getLogger().warn("playFrom: " + seconds + " " + this.getState());
                switch (this.getState()) {
                    case MediaPlayer.STATE.STOPPED:
                        this.video_API_load(this._source,
                                            this._license,
                                            this._customData,
                                            this._sourceType);
                        this.video_API_setplaytime(seconds);
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
                    this._toStopGetCurrentTime();
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
                return this._currentTime;
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

            /**
             * @inheritDoc
             */
            setSubtitleTrack: function (subtitleTrack) {
                try {
                    // RuntimeContext.getDevice().getLogger().warn("setSubtitleTrack: " + subtitleTrack);
                    this.video_API_set_subtitle_track(subtitleTrack);
                } catch (e) {
                  RuntimeContext.getDevice().getLogger().warn("setSubtitleTrack: error " + e);
                }
            },

            /**
             * @inheritDoc
             */
            setAudioTrack: function (audioTrack) {
                switch (this.getState()) {
                    case MediaPlayer.STATE.STOPPED:
                        this.video_API_set_audio_track(audioTrack);
                    break;

                    case MediaPlayer.STATE.BUFFERING:
                    case MediaPlayer.STATE.PLAYING:
                    case MediaPlayer.STATE.PAUSED:
                        var time = this._currentTime;
                        this._toAudioChanged(time, audioTrack);
                    break;

                    default:
                        this._toError('Cannot setAudioTrack while in the \'' + this.getState() + '\' state');
                    break;
                }
            },

            /**
             * @inheritDoc
             */
            getSubtitleTracks: function () {
                var subtitlesParams = {
                    subtitleTracks: this._subtitleTracks,
                    currentSubtitleTrack: this._currentSubtitleTrack
                };

                return subtitlesParams;
             },

            /**
            * @inheritDoc
            */
            getAudioTracks: function () {
                var audioParams = {
                    audioTracks: this._audioTracks,
                    audioNumChannels: this._audioNumChannels,
                    currentAudioTrack: this._currentAudioTrack
                };

                return audioParams;
            },

            _onDeviceError: function(message) {
                this._reportError(message);
            },

            _stopPlayer: function() {
                this.video_API_stop();
                this._currentTimeKnown = false;
                this._toStopGetCurrentTime();
            },

            _onCurrentTime: function(time) {
                // RuntimeContext.getDevice().getLogger().warn("_onCurrentTime " + time.elapsedTime);
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
                this._subtitleTracks = undefined;
                this._currentSubtitleTrack = undefined;
                this._audioTracks = undefined;
                this._audioNumChannels = undefined;
                this._currentAudioTrack = undefined;
            },

            _reportError: function(errorMessage) {
                // RuntimeContext.getDevice().getLogger().error(errorMessage);
                this._emitEvent(MediaPlayer.EVENT.ERROR, {'errorMessage': errorMessage});
            },

            _toStopped: function () {
                this._currentTime = 0;
                this._range = undefined;
                this._state = MediaPlayer.STATE.STOPPED;
                this._emitEvent(MediaPlayer.EVENT.STOPPED);
                this._toStopGetCurrentTime();
            },

            _toBuffering: function () {
                this._state = MediaPlayer.STATE.BUFFERING;
                this._emitEvent(MediaPlayer.EVENT.BUFFERING);
            },

            _toPlaying: function () {
                this._state = MediaPlayer.STATE.PLAYING;
                this._emitEvent(MediaPlayer.EVENT.PLAYING);
                if (!this._timePoll) {
                    this._toUpdateCurrentTime();
                }
                if (this._audioChanged) {
                    this._audioChanged = false;
                    this.video_API_setplaytime(this._audioChangedTime);
                    this._audioChangedTime = undefined
                }
            },

            _toPaused: function () {
                this._state = MediaPlayer.STATE.PAUSED;
                this._emitEvent(MediaPlayer.EVENT.PAUSED);
                this._toStopGetCurrentTime();
            },

            _toComplete: function () {
                this._state = MediaPlayer.STATE.COMPLETE;
                this._emitEvent(MediaPlayer.EVENT.COMPLETE);
                this._toStopGetCurrentTime();
            },

            _toEmpty: function () {
                this._state = MediaPlayer.STATE.EMPTY;
                this._toStopGetCurrentTime();
            },

            _toError: function(errorMessage) {
                // RuntimeContext.getDevice().getLogger().warn("_toError");
                this._wipe();
                this._state = MediaPlayer.STATE.ERROR;
                this._reportError(errorMessage);
                throw 'ApiError: ' + errorMessage;
            },

            _toUpdatePlayTime: function () {
                // RuntimeContext.getDevice().getLogger().warn("_toUpdatePlayTime");
                this.video_API_asynchronous_get_playtime();
            },

            _toSetAudioDetails: function (audioTracks, audioNumChannels, currentAudioTrack) {
                this._audioTracks = audioTracks;
                this._audioNumChannels = audioNumChannels;
                this._currentAudioTrack = currentAudioTrack;
            },

            _toSetSubTitleDetais: function (subtitleTracks, currentSubtitleTrack) {
                this._subtitleTracks = subtitleTracks;
                this._currentSubtitleTrack = currentSubtitleTrack;
            },

            _toUpdateCurrentTime: function () {
                // RuntimeContext.getDevice().getLogger().warn("_toUpdateCurrentTime");
                var self = this;
                try {
                    this._timePoll = setInterval(function(){ self._toUpdatePlayTime() }, 800);
                } catch (e) {
                  RuntimeContext.getDevice().getLogger().warn("_toUpdateCurrentTime error: " + e);
                }
            },

            _getStreamDetails: function () {
              this.video_API_get_audio_tracks();
              this.video_API_get_subtitle_tracks();
            },

            _toStopGetCurrentTime: function () {
              // RuntimeContext.getDevice().getLogger().warn("_toStopGetCurrentTime");
              clearInterval(this._timePoll);
              this._timePoll = undefined;
            },

            _toShowSubtitle: function (SubtitlesSize, SubtitlesText) {
              document.getElementById("subtitleArea").innerHTML = SubtitlesText;
            },

            _toAudioChanged: function (audioTimeChanged, newAudioTrack) {
              this._audioChanged = true;
              this._audioChangedTime = audioTimeChanged;
              this.stop();
              this.video_API_set_audio_track(newAudioTrack);
              this.video_API_load(this._source,
                                  this._license,
                                  this._customData,
                                  this._sourceType);
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

            video_API_get_audio_tracks: function() {
              this._player.webmaf_get_audio_tracks();
            },

            video_API_get_subtitle_tracks: function() {
              this._player.webmaf_get_subtitle_tracks();
            },

            video_API_set_subtitle_track: function(track_code) {
              try {
                  this._player.webmaf_set_subtitle_track(track_code);
              } catch (e) {
                  RuntimeContext.getDevice().getLogger().warn("video_API_set_subtitle_track error " + e);
              }
            },

            video_API_set_audio_track: function(track_code) {
                this._player.webmaf_set_audio_track(track_code);
            },

            video_API_set_video_portal: function(left_top_x,left_top_y,right_bottom_x,right_bottom_y) {
              this._player.webmaf_set_audio_track(left_top_x,left_top_y,right_bottom_x,right_bottom_y);
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
