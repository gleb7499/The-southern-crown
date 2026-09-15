# Installing the MediaMTX Media Server for Restreaming Surveillance Camera Streams

Installation is performed from the MediaMTX project releases page:
https://github.com/bluenviron/mediamtx/tags

At the time of writing, the latest actual version is v1.9.0.

Installing the media server consists of the following steps:
1. download the archive of the appropriate platform from a release (generally - amd64);
2. unpack the downloaded archive;
3. move the unpacked binary file `mediamtx` to the `/usr/local/bin` folder;
4. copy the configuration file `mediamtx.yml` from the current folder to `/usr/local/etc`;
5. create the folder `/var/log/mediamtx`;
6. copy the systemd service description `mediamtx.service` from the current folder to `/etc/systemd/system`;
7. start the service with the command `systemctl start mediamtx`;
8. make sure the service started successfully with the command `systemctl status mediamtx`; the service must be active;
9. add the service to autostart with the command `systemctl enable mediamtx`

**Attention!** The media server uses TCP ports 8554 (RTSP), 8888 (HLS) and UDP 8000 (RTP), 8001 (RTCP). You must first make sure these ports are available and do not conflict with already running applications; otherwise, you need to remap them either in the conflicting application or in the MediaMTX configuration (which, in turn, may affect the frontend code).

It is possible to run the service as an unprivileged user. In this case, you need to fix the service description file (add the parameter `User=username` to the `Service` section) and make sure the log directory `/var/log/mediamtx` is writable by the specified user.

# Configuring the Media Server

The media server configuration is located in the file `mediamtc.yml`

The difference between the default configuration and the one used lies in specifying an explicit directory for storing the log, as well as disabling publishing via the RTMP, WebRTC, and SRT protocols:

```diff
14c14
< logFile: mediamtx.log
---
> logFile: /var/log/mediamtx/mediamtx.log
263c263
< rtmp: yes
---
> rtmp: no
342c342
< webrtc: yes
---
> webrtc: no
395c395
< srt: yes
---
> srt: no
```
