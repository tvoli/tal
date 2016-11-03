define(
    'antie/devices/mediaplayer/magine_webmafapi',
    [
      "antie/class",
      "antie/runtimecontext"
    ],
    function (Class, RuntimeContext) {

      return Class.extend({

        current_time: 0,

        init: function () {
        },

        // logCommand: function (txt) {
        //   document.getElementById("command-area").innerHTML = txt + '<br/>' +
        //       document.getElementById("command-area").innerHTML;;
        // },

        getCurrentTime: function () {
          return this.current_time;
        },

        setCurrentTime: function (value) {
          this.current_time = value;
        },

        _webmaf_api_entry: function (command,dont_echo_to_debug_tty){
          try {
            //this.logCommand("--> WebMAF API:" + command);
            window.external.user(command);
          } catch (e) {
            //this.logCommand("--> WebMAF API error:" + e);
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
        }

      });
    }
);
