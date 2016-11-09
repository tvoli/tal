define(
    'antie/devices/mediaplayer/magine_webmafapi',
    [
        "antie/class",
        "antie/runtimecontext",
        'antie/callbackmanager'
    ],
    function (Class, RuntimeContext, CallbackManager) {

        return Class.extend({

            _current_time: 0,
            _logBox: undefined,

            init: function () {
                this._callbackManager = new CallbackManager();
                this._createPs4Listeners();
            },

            addEventCallback: function(thisArg, callback) {
                this._logCommand("Adding callback");
                this._callbackManager.addCallback(thisArg, callback);
            },

            removeEventCallback: function(thisArg, callback) {
                this._callbackManager.removeCallback(thisArg, callback);
            },

            getCurrentTime: function () {
                return this._current_time;
            },

            setCurrentTime: function (value) {
                this._current_time = value;
            },

            _webmaf_api_entry: function (command,dont_echo_to_debug_tty){
                try {
                    window.external.user(command);
                } catch (e) {
                    this._logCommand("--> WebMAF API error:" + e);
                }
                if (typeof dont_echo_to_debug_tty=='undefined'){
                    console.log(command);
                    RuntimeContext.getDevice().getLogger().warn("--> WebMAF API:" + command);
                }
            },

            webmaf_stop: function () {
                this._webmaf_api_entry('{"command":"stop"}');
            },

            webmaf_setplaytime: function (play_pos) {
                this._webmaf_api_entry('{"command":"setPlayTime","playTime":'+play_pos+'}');
            },

            webmaf_pause: function () {
                this._webmaf_api_entry('{"command":"pause"}');
            },

            webmaf_play: function () {
                try {
                    this._webmaf_api_entry('{"command":"play"}');
                } catch (e) {
                    RuntimeContext.getDevice().getLogger().warn(" webmafapi error" + e);
                }
            },

            webmaf_load: function (url, license, custom_data, sourceType) {
                // var play_command='{"command":"load","contentUri":"'+url+'","licenseUri":"'+license+'","customData":"'+custom_data+'","sourceType":'+sourceType+'}';
                var play_command = undefined;
                if (!url) {
                    //this.logCommand("No URL was set.");
                } else {
                    play_command = '{"command":"load","contentUri":"'+url+'"';
                }
                if (license) {
                    play_command += ',"licenseUri":"'+license+'"';
                }
                if (custom_data) {
                    var data = JSON.stringify(custom_data);
                    var preparedCustomData = btoa(data);
                    play_command += ',"customData":"'+preparedCustomData+'"';
                }
                if (sourceType) {
                    play_command += ',"sourceType":'+sourceType+'';
                }
                play_command += '}';

                this._webmaf_api_entry(play_command);
            },

            webmaf_asynchronous_get_playtime: function () {
                this._webmaf_api_entry('{"command":"getPlaybackTime"}',false);
            },

            webmaf_get_audio_tracks: function () {
                this._webmaf_api_entry('{"command":"getAudioTracks"}');
            },

            webmaf_get_subtitle_tracks: function () {
                this._webmaf_api_entry('{"command":"getSubtitleTracks"}');
            },

            webmaf_set_subtitle_track: function (track_code) {
                this._webmaf_api_entry('{"command":"setClosedCaptions","enable":true}');
                this._webmaf_api_entry('{"command":"setSubtitleTrack","subtitleTrack":"'+track_code+'","renderSubtitle":"false"}');
            },

            webmaf_set_audio_track: function (track_code){
                this._webmaf_api_entry('{"command":"setAudioTrack","audioTrack":"'+track_code+'"}');
            },

            webmaf_set_set_audio_track: function (left_top_x,left_top_y,right_bottom_x,right_bottom_y) {
                this._webmaf_api_entry('{"command":"setVideoPortalSize","ltx":'+left_top_x+',"lty":'+left_top_y+',"rbx":'+right_bottom_x+', "rby":'+right_bottom_y+'}');
            },

            webmaf_isPsnConnected: function () {
                this._webmaf_api_entry('{"command":"isPsnConnected"}');
            },

            webmaf_isPsnPlusAccount: function () {
                this._webmaf_api_entry('{"command":"isPsnPlusAccount"}');
            },

            webmaf_getPsnUserDOB: function () {
                this._webmaf_api_entry('{"command":"getPsnUserDOB"}');
            },

            webmaf_getNpAuthCode: function () {
                this._webmaf_api_entry('{"command":"getNpAuthCode"}');
            },

            webmaf_getPsnUserAge: function () {
                this._webmaf_api_entry('{"command":"getPsnUserAge"}');
            },

            webmaf_getPsnOnlineId: function () {
                this._webmaf_api_entry('{"command":"getPsnOnlineId"}');
            },

            webmaf_getPsnTicket: function () {
                this._webmaf_api_entry('{"command":"getPsnTicket"}');
            },

            webmaf_getPsnCommerceProductData: function (id) {
                this._webmaf_api_entry('{"command":"getPsnCommerceProductData", “id”:”' + id +'"}');
            },

            webmaf_getPsnEntitlementList: function () {
                this._webmaf_api_entry('{"command":"getPsnEntitlementList"}');
            },

            webmaf_setPsnPresenceInfo: function (message) {
                this._webmaf_api_entry('{"command":"setPsnPresenceInfo", "presenceInfo":"' + message +'"}');
            },

            _logCommand: function (txt) {
                if (this._logBox == undefined)
                this._createLogBox();

                this._logBox.innerHTML = txt + '<br/>' + this._logBox.innerHTML;
            },

            _createLogBox: function () {
                this._logBox = document.createElement("div");
                this._logBox.id = "logbox";
                this._logBox.style.position = "absolute";
                this._logBox.style.top = "50%";
                this._logBox.style.left = "0%";
                this._logBox.style.width = "100%";
                this._logBox.style.height = "50%";
                this._logBox.style.color = "#000000";
                this._logBox.style.backgroundColor = "#d8d8d8";
                this._logBox.style.backgroundColor = 'rgba(216,216,216,0.8)';
                this._logBox.style.lineHeight = '12px';
                this._logBox.style.fontSize = '12px';
                this._logBox.style.zIndex = '9999';
                document.body.appendChild(this._logBox);
            },

            _createPs4Listeners: function () {
                this._logCommand("Creating listeners");
                window.accessfunction = function (json) {
                    var event = new CustomEvent('playerResponses', {detail:json});
                    window.dispatchEvent(event);
                    document.getElementById("debug-area").innerHTML = json + '<br/>' +
                    document.getElementById("debug-area").innerHTML;
                }
                window.addEventListener('playerResponses', this._emitEvent.bind(this), false);
            },

            _emitEvent: function (data) {
                var result = JSON.parse(data.detail);
                this._logCommand("sending event = " + JSON.stringify(result));
                this._callbackManager.callAll(data);
            }
        });
    }
);
