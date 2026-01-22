import logging
import asyncpg

from typing import Optional

logger = logging.getLogger()


class DBI:
    def __init__(self, dsn: str):
        self.dsn = dsn
        self.conn: Optional[asyncpg.Connection] = None 
        self.stm_cameras_list: Optional[asyncpg.PreparedStatement] = None

    async def connect(self):
        if self.conn is not None:
            await self.done()

        result = False

        try:
            self.conn = await asyncpg.connect(self.dsn)
            self.stm_cameras_list = await self.conn.prepare("SELECT id, name, url FROM camera ORDER BY id")
            result = True
            logger.info("Successfully connected to PostgreSQL database")
        except Exception as e:
            logger.error(f"Can't establish connection to the database {self.dsn}, reason {e}")
            self.conn = None
            self.stm_cameras_list = None

        return result

    async def get_camera_urls(self):
        result = {}

        if self.conn is None or self.stm_cameras_list is None:
            logger.warning("Database connection not established. Attempting to reconnect...")
            if not await self.connect():
                logger.error("Failed to reconnect to database")
                return result

        try:
            cameras = await self.stm_cameras_list.fetch()
            for camera in cameras:
                camera_id = camera['id']
                camera_name = camera['name']
                camera_url = camera['url']
                
                if camera_url:  # Only add cameras with valid URLs
                    result[camera_id] = {"camera_type": camera_name, "url": camera_url}
            
            logger.debug(f"Loaded {len(result)} cameras from database")
        except Exception as e:
            logger.error(f"Can't get camera's list from database, reason {e}")
            # Try to reconnect on next call
            self.conn = None
            self.stm_cameras_list = None

        return result

    async def done(self):
        if self.conn is not None:
            await self.conn.close()

        self.conn = None
        self.stm_cameras_list = None
