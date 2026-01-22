import os
import sys
import asyncio
import logging

from typing import List, Any
from asyncio.events import AbstractEventLoop

from .state import State
from .db import DBI

logger = logging.getLogger()


def init(pg_dsn: str):
    logger.info("Service starting")
    loop = asyncio.get_event_loop()
    state = loop.run_until_complete(init_state(pg_dsn, loop))
    if state is None:
        sys.exit(2)
    else:
        logger.info("Service started")

        try:
            loop.run_forever()
        except (SystemExit, KeyboardInterrupt):
            logger.info("Service stopping")
        except Exception as e:
            logger.exception(f"Service crashed {e}")
        finally:
            loop.run_until_complete(shutdown(state))
            logger.info("Service stopped")


async def init_state(pg_dsn: str, loop: AbstractEventLoop):
    state = None
    db = DBI(pg_dsn)

    if await db.connect():
        state = State(loop, db)
    else:
        logger.critical(f"Can't make initial connect to PostgreSQL {pg_dsn}")

    return state


async def shutdown(state):
    if state and state.db:
        await state.db.done()
