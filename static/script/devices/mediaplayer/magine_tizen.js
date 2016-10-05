define(
    'antie/devices/mediaplayer/samsung_maple',
    [
        'antie/devices/device',
        'antie/devices/mediaplayer/mediaplayer',
        'antie/runtimecontext'
    ],
    function(Device, MediaPlayer, RuntimeContext) {
        'use strict';

        /**
         * @name antie.devices.mediaplayer.Magine_Tizen
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

                this._player = webapis.avplay;
            },

            /**
             * @inheritDoc
             */
            setSource: function (mediaType, url, mimeType) {
                console.log("set Source");
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

            },

            /**
             * @inheritDoc
             */
            playFrom: function (seconds) {

            },

            /**
             * @inheritDoc
             */
            beginPlayback: function() {
                console.log('AVPlayer.play()', "Current state: " + this._player.getState());
                try {
                    this._player.play();
                    console.log('AVPlayer.play()', "Current state: " + this._player.getState());
                } catch (e) {
                    console.log('AVPlayer.play()', "Current state: " + this._player.getState());
                    console.log(e);
                }
            },

            /**
             * @inheritDoc
             */
            beginPlaybackFrom: function(seconds) {

            },

            /**
             * @inheritDoc
             */
            pause: function () {

            },

            /**
             * @inheritDoc
             */
            stop: function () {

            },

            /**
             * @inheritDoc
             */
            reset: function () {

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

            },

            /**
             * @inheritDoc
             */
            getSeekableRange: function () {

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

            _prepare: function () {
                this._player.open(this._source);
                this._player.setListener(this._createListener());

                this._player.prepare();
                this._player.setDisplayRect(
                    this._playerPlugin.offsetLeft, this._playerPlugin.offsetTop,
                    this._playerPlugin.offsetWidth, this._playerPlugin.offsetHeight
                );
                this._player.setDisplayMethod('PLAYER_DISPLAY_MODE_FULL_SCREEN');
            },

            _createListener: function (evt) {
                console.log('AVPlayer._listener()', 'creating listener');
                if (!this._listener) {
                    this._listener = {
                        onbufferingstart: function() {
                            console.log('AVPlayer._createListener()', "Buffering start.");
                        },
                        onbufferingprogress: function(percent) {
                            console.log('AVPlayer._createListener()', "Buffering progress. " + percent);
                        },
                        onbufferingcomplete: function() {
                            console.log('AVPlayer._createListener()', "Buffering complete.");
                        }
                    };
                }

                return this._listener;
            },

            _toError: function(errorMessage) {
                this._wipe();
                this._state = MediaPlayer.STATE.ERROR;
                this._reportError(errorMessage);
                throw 'ApiError: ' + errorMessage;
            },

            _isSuccessCode: function(code) {
                var samsung2010ErrorCode = -1;
                return code && code !== samsung2010ErrorCode;
            },

            /**
             * @constant {Number} Time (in seconds) compared to current time within which seeking has no effect.
             * On a sample device (Samsung FoxP 2013), seeking by two seconds worked 90% of the time, but seeking
             * by 2.5 seconds was always seen to work.
             */
            CURRENT_TIME_TOLERANCE: 2.5
        });

        var instance = new Player();

        // Mixin this MediaPlayer implementation, so that device.getMediaPlayer() returns the correct implementation for the device
        Device.prototype.getMediaPlayer = function() {
            return instance;
        };

        return Player;
    }
);
