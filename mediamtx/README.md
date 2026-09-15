# Migration to MediaMTX

First, MediaMTX must be installed on the server according to the [instructions](install/README.md).

**Attention!** If the broadcast server address differs from the main server address, you need to fix the `src/utils/getStream.js` file in the [Rockwell_front](https://github.com/Data-Acquisition/Rockwell_front) repository, fixing the `getCameraPlayerUrl` function.

## Restreaming Service

Designed to receive the stream from a camera and re-stream it to the broadcast server, from where it can later be viewed by users, saved to an archive, or analyzed. The need for restreaming stems from the fact that an IP camera is a device with a fairly weak CPU that does not handle a large number of connections well. The broadcast server, in turn, is usually installed on powerful servers and can duplicate the stream to a large number of consumers.

The restreaming server logic:

* starts up and establishes a connection to the DBMS;
* requests the list of current cameras;
* builds RTSP addresses for the received cameras;
* for each camera performs the following set of actions:
  * checks camera availability and whether it has audio;
  * if the camera is unavailable, repeats the check after some time;
  * if the camera is available - creates a restreaming command to the broadcast server;
  * monitors the health of the restreaming process; if interrupted - checks the camera address for relevance (its presence in the database);
  * if the camera is missing from the database - the process terminates;
  * if the camera is present - the restreaming process is restarted.
* periodically checks the list of current cameras for changes and starts new restreaming processes when necessary.

The service is written in Python 3 (version 3.10) and uses the `asyncpg` library to access the PostgreSQL database.

### Service Structure

  * `etc`
    * `restream_log.conf` - logging configuration for the service; through it you can specify where to store log files and how much and what information they should contain;
  * `log` - default log directory. Empty in the initial state;
  * `src`
    * `db.py` - database module. Queries the camera table and converts the received data to the required format;
    * `ffmpeg.py` - module for working with media streams. Validates the incoming stream address and assembles the restreaming command;
    * `main.py` - service launch module;
    * `state.py` - the service state itself. Tracks changes in DB data and restreaming processes and performs start/stop as needed;
  * `requiments.txt` - list of service dependencies;
  * `restream.service` - example service description for installation under the `systemd` supervisor;
  * `srvc_restream.py` - service entry point. Parses environment and command-line parameters and passes them to the launch module;
  * `start.sh` - example launch script.
