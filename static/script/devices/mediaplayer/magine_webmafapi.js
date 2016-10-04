define(
    'antie/devices/mediaplayer/webmafapi',
    [
      "antie/class",
      "antie/runtimecontext"
    ],
    function (Class, RuntimeContext) {

      return Class.extend({

        current_time: 0,

        init: function () {
        },

        getCurrentTime: function () {
          return this.current_time;
        },

        setCurrentTime: function (value) {
          this.current_time = value;
        },

        _webmaf_api_entry: function (command,dont_echo_to_debug_tty){
          try {
            window.external.user(command);
          } catch (e) {
            RuntimeContext.getDevice().getLogger().warn("--> WebMAF API error:" + e);
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
            //RuntimeContext.getDevice().getLogger().warn(" webmafapi play");
            this._webmaf_api_entry('{"command":"play"}');
          } catch (e) {
            //RuntimeContext.getDevice().getLogger().warn(" webmafapi error" + e);
          }
        },

        webmaf_load: function (url, license, custom_data, sourceType) {
          var play_command='{"command":"load","contentUri":"'+url+'","licenseUri":"'+license+'","customData":"'+custom_data+'","sourceType":'+sourceType+'}';
          this._webmaf_api_entry(play_command);
        },

        webmaf_asynchronous_get_playtime: function () {
          this._webmaf_api_entry('{"command":"getPlaybackTime"}',false);
        },

        webmaf_check_audio_and_timedtext_streams: function () {
          this._webmaf_api_entry('{"command":"getAudioTracks"}');
          this._webmaf_api_entry('{"command":"getSubtitleTracks"}');
        },

        webmaf_set_subtitle_track: function (track_code) {
          this._webmaf_api_entry('{"command":"setClosedCaptions","enable":true}');
          this._webmaf_api_entry('{"command":"setSubtitleTrack","subtitleTrack":"'+track_code+'","renderSubtitle":"false"}');
        },

        audio_language_change_workaround: "use_it",

        webmaf_set_audio_track: function (track_code){
          if (this.audio_language_change_workaround=="use_it"){
            this.webmaf_set_audio_track_with_workaround_for_fastforwarding(track_code);
          }else{
            this._webmaf_api_entry('{"command":"setAudioTrack","audioTrack":"'+track_code+'"}');
          }
        },

        set_audio_track_workaround_state: "inactive",
        webmaf_set_audio_track_with_workaround_for_fastforwarding: function (track_code) {
          var saved_cur_time=this.current_time
          this.webmaf_stop();
          set_audio_track_workaround_state="waiting_for_load_to_complete";
          this._webmaf_api_entry('{"command":"setAudioTrack","audioTrack":"'+track_code+'"}');  // WebMAF will save this irrespective of whether the currely loaded video contains the specififed track
          this.webmaf_load(video_path_URL+films[film_pos][0], films[film_pos][1], films[film_pos][2]);
          next_movie_resume_time = films[film_pos][3];
          tick_time_to_play_next = films[film_pos][4];
          if (tick_time_to_play_next != 0) {
            tick_time_to_play_next = tick_time_to_play_next * 10 + my_decisecond_timer;
          }
        },

        set_audio_track_workaround_load_complete_check: function () {
          switch(set_audio_track_workaround_state){
            case "waiting_for_load_to_complete":
            this.webmaf_setplaytime(saved_cur_time);
            break;
          }
        },

        webmaf_set_set_audio_track: function (left_top_x,left_top_y,right_bottom_x,right_bottom_y) {
          this._webmaf_api_entry('{"command":"setVideoPortalSize","ltx":'+left_top_x+',"lty":'+left_top_y+',"rbx":'+right_bottom_x+', "rby":'+right_bottom_y+'}');
        }
      });
    }
);
