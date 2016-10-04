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
                //this._player = document.getElementById('playerPlugin');
                try {
                this._super();
                this._player = new PS4PlayerAPI();
                this._state = MediaPlayer.STATE.EMPTY;
                RuntimeContext.getDevice().getLogger().warn('magine_ps4.init()', this._player);
              } catch (e) {
                RuntimeContext.getDevice().getLogger().warn("--> WebMAF API error:" + e);
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
                this._postBufferingState = MediaPlayer.STATE.PLAYING;
                switch (this.getState()) {
                case MediaPlayer.STATE.PLAYING:
                    break;

                case MediaPlayer.STATE.BUFFERING:
                    break;

                case MediaPlayer.STATE.PAUSED:
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
                var seekingTo = this._range ? this._getClampedTimeForPlayFrom(seconds) : seconds;

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
                        //this._seekToWithFailureStateTransition(seekingTo);
                    }
                    break;


                case MediaPlayer.STATE.PAUSED:
                    this._toBuffering();
                    if (!this._currentTimeKnown) {
                        this._deferSeekingTo = seekingTo;
                    } else if (this._isNearToCurrentTime(seekingTo)) {
                        this._playerPlugin.Resume();
                        this._toPlaying();
                    } else {
                        //this._seekToWithFailureStateTransition(seekingTo);
                        this._playerPlugin.Resume();
                    }
                    break;

                case MediaPlayer.STATE.COMPLETE:
                    this._playerPlugin.Stop();
                    //this._setDisplayFullScreenForVideo();
                    this._toBuffering();
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
                    this._toBuffering();
                    //this._player.video_API_load(getSource());
                    this._player.play();
                    //this._setDisplayFullScreenForVideo();
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
                var seekingTo = this._range ? this._getClampedTimeForPlayFrom(seconds) : seconds;

                switch (this.getState()) {
                case MediaPlayer.STATE.STOPPED:
                    //this._setDisplayFullScreenForVideo();
                    this._toBuffering();
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
                    break;

                case MediaPlayer.STATE.PLAYING:
                    //this._tryPauseWithStateTransition();
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
                if (this.getState() === MediaPlayer.STATE.STOPPED) {
                    return undefined;
                } else {
                    return this._currentTime;
                }
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

            _onFinishedBuffering: function() {
                if (this.getState() !== MediaPlayer.STATE.BUFFERING) {
                    return;
                }

                if (this._deferSeekingTo === null) {
                    if (this._postBufferingState === MediaPlayer.STATE.PAUSED) {
                        //this._tryPauseWithStateTransition();
                    } else {
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
                this._playerPlugin.Stop();
                this._currentTimeKnown = false;
            },

            _onStatus: function() {
                var state = this.getState();
                if (state === MediaPlayer.STATE.PLAYING) {
                    this._emitEvent(MediaPlayer.EVENT.STATUS);
                }
            },

            _onMetadata: function() {
                this._range = {
                    start: 0,
                    end: this._playerPlugin.GetDuration() / 1000
                };
            },

            _onCurrentTime: function(timeInMillis) {
                this._currentTime = timeInMillis / 1000;
                this._onStatus();
                this._currentTimeKnown = true;

                if (this._deferSeekingTo !== null) {
                    this._deferredSeek();
                }

                if (this._tryingToPause) {
                    //this._tryPauseWithStateTransition();
                }
            },

            _deferredSeek: function() {
                var clampedTime = this._getClampedTimeForPlayFrom(this._deferSeekingTo);
                var isNearCurrentTime = this._isNearToCurrentTime(clampedTime);

                if (isNearCurrentTime) {
                    this._toPlaying();
                    this._deferSeekingTo = null;
                } else {
                    var seekResult = this._seekTo(clampedTime);
                    if (seekResult) {
                        this._deferSeekingTo = null;
                    }
                }
            },

            _getClampedTimeForPlayFrom: function (seconds) {
                var clampedTime = this._getClampedTime(seconds);
                if (clampedTime !== seconds) {
                    RuntimeContext.getDevice().getLogger().debug('playFrom ' + seconds+ ' clamped to ' + clampedTime + ' - seekable range is { start: ' + this._range.start + ', end: ' + this._range.end + ' }');
                }
                return clampedTime;
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

            _seekTo: function(seconds) {
                var offset = seconds - this.getCurrentTime();
                this._jump(offset);
                this._currentTime = seconds;
            },

            _jump: function (offsetSeconds) {
                if (offsetSeconds > 0) {
                    return this._playerPlugin.JumpForward(offsetSeconds);
                } else {
                    return this._playerPlugin.JumpBackward(Math.abs(offsetSeconds));
                }
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
