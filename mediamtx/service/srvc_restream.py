import os
import sys
import signal
import logging
import logging.config
import argparse

from src.main import init


logging.config.fileConfig('etc/restream_log.conf')
logger = logging.getLogger()


if __name__ == '__main__':

    pg_dsn = os.environ.get("PG_DSN", None)

    if pg_dsn is None:
        parser = argparse.ArgumentParser()
        parser.add_argument('--pg_dsn', dest='pg_dsn', required=True, action='store',
                        help='PostgreSQL connection URI, like postgres://user:password@host:port/database?option=value')
        args = parser.parse_args()
        pg_dsn = args.pg_dsn

    #
    # OS signal processing
    #

    def sig_handler(signo, frame):
        logger.warning(f"Get signal {signo}")
        sys.exit(1)

    signal.siginterrupt(signal.SIGTERM, False)
    signal.signal(signal.SIGTERM, sig_handler)
    signal.siginterrupt(signal.SIGINT, False)
    signal.signal(signal.SIGINT, sig_handler)

    #
    # Init main cycle
    #

    init(pg_dsn)
