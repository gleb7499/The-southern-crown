import os
import json
import logging
import subprocess

logger = logging.getLogger()

MEDIA_SERVER_HOST = "localhost"
MEDIA_SERVER_PORT = 8554
MEDIA_SERVER_STREAM_PREFIX = "stream_"

# MEDIA_ENCODER="vaapi"
MEDIA_ENCODER="cuda"

def get_stream_info(camera_type, url):
    info = None
    input_prefix = "-rtsp_transport tcp"

    try:
        if camera_type == "VEI":
            input_prefix = ""

        check_cmd = f"ffprobe -v quiet -analyzeduration 10M -probesize 50M -show_streams -print_format json {input_prefix} '{url}'"
        data = subprocess.check_output(check_cmd, shell=True, timeout=30)

        if data is not None:
            info = json.loads(data)
    except Exception as e:
        print(f"[ERROR] ffprobe failed: {e}")
        pass

    print(f"[DEBUG] info for {url} = {info}")

    return info


def make_restream_cmd(camera_id, camera_type, url):
    cmd = None

    info = get_stream_info(camera_type, url)
    # logger.debug(f"[{camera_id}] Stream info for {url} = {info}")

    if info is not None:
        try:
            input_prefix = "-rtsp_transport tcp"
            video_tr = "-codec:v copy"
            audio_tr = "-an"

            if camera_type == "VEI":
                input_prefix = ""

            if len(info['streams']) > 1:
                # the stream probably with audio track
                for i in info['streams']:
                    if i['codec_type'] == 'audio':
                        if i['codec_name'] == 'aac':
                            audio_tr = "-codec:a copy"
                        else:
                            audio_tr = "-codec:a copy"

            if info['streams'][0] and info['streams'][0]['codec_name'] != "h264":
                # need encode to h.264
                common_params = "-b:v 2M -maxrate 8M"

                if os.path.exists("/dev/dri/renderD128"):
                    # hardware encoding support
                    if MEDIA_ENCODER == 'vaapi':
                        input_prefix = f"-hwaccel vaapi -hwaccel_device /dev/dri/renderD128 -hwaccel_output_format vaapi {input_prefix}"
                        video_tr = f"-codec:v h264_vaapi {common_params}"
                    else:
                        input_prefix = f"-vsync 0 -hwaccel cuda {input_prefix}"
                        video_tr = f"-codec:v h264_nvenc {common_params}"                        
                else:
                    # software encoding
                    input_prefix = f"-hwaccel auto {input_prefix}"
                    video_tr = f"-codec:v libx264 -profile:v high -preset:v ultrafast -tune:v fastdecode {common_params}"

                
            cmd = f"ffmpeg -loglevel error -nostats -hide_banner -stream_loop -1 {input_prefix} -i '{url}' {video_tr} {audio_tr} -f rtsp rtsp://{MEDIA_SERVER_HOST}:{MEDIA_SERVER_PORT}/{MEDIA_SERVER_STREAM_PREFIX}{camera_id}"
            print(cmd)
        except Exception as e:
            cmd = None
            print(f"[ERROR] ffprobe failed: {e}")
            pass

    return cmd
