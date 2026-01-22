import asyncio
from datetime import datetime, timedelta
import logging

from asyncio import Task
import subprocess
from typing import Optional, Any, Dict, List
from subprocess import Popen

from .db import DBI
from .ffmpeg import make_restream_cmd


AWAIT_INTERVAL_PROC = 5
AWAIT_INTERVAL_NEW_URL = 10
AWAIT_INTERVAL_CHECK = 30
FFMPEG_INACTIVITY_TIMEOUT = 60  # seconds

logger = logging.getLogger()

class State:
    def __init__(self, loop: asyncio.AbstractEventLoop, db: DBI):
        self.db = db
        self.streams: Dict[int, str] = {}
        self.camera_types: Dict[int, str] = {}
        self.to_close: List[int] = []

        self.loop = loop
        self.check_task: Optional[Task[Any]] = None
        self.restream_tasks: Dict[int, Task[Any]] = {}

        self.start_check_task()


    def start_check_task(self):
        logger.debug(f"Start checking task")
        self.check_task = self.loop.create_task(self.check_task_loop())

    def add_restream_task(self, camera_id):
        logger.info(f"[{camera_id}] Start restream task")
        after_done = lambda Task: self.restream_done(camera_id)

        self.restream_tasks[camera_id] = self.loop.create_task(self.restream_loop(camera_id))
        self.restream_tasks[camera_id].add_done_callback(after_done)

    async def check_task_loop(self):
        while True:
            to_close = list(self.streams.keys())
            cameras = await self.db.get_camera_urls()

            new_streams = {}
            new_camera_types = {}

            for camera_id, camera_info in cameras.items():
                new_streams[camera_id] = camera_info['url']
                new_camera_types[camera_id] = camera_info['camera_type']

            self.streams = new_streams
            self.camera_types = new_camera_types

            for camera_id in new_streams.keys():
                if camera_id in to_close:
                    to_close.remove(camera_id)

                # 🛠️ Главное изменение — добавляем рестрим, если нет активной задачи
                if camera_id not in self.restream_tasks:
                    self.add_restream_task(camera_id)

            self.to_close = to_close

            await asyncio.sleep(AWAIT_INTERVAL_CHECK)


    async def restream_loop(self, camera_id):
        logger.info(f"[{camera_id}] Starting eternal restream loop")

        while True:
            try:
                url = self.streams.get(camera_id)
                camera_type = self.camera_types.get(camera_id)

                if not url or not camera_type:
                    logger.warning(f"[{camera_id}] No URL or camera type found. Waiting before retry...")
                    await asyncio.sleep(AWAIT_INTERVAL_NEW_URL)
                    continue  # ждем и пробуем снова

                try:
                    cmd = await self.get_cmd(camera_id, camera_type, url)
                except Exception as e:
                    logger.warning(f"[{camera_id}] Could not get restream command: {e}")
                    await asyncio.sleep(10)
                    continue  # важный момент: цикл продолжается
                logger.debug(f"[{camera_id}] Starting ffmpeg with command: {cmd}")

                proc = Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                last_output = datetime.now()

                while True:
                    await asyncio.sleep(AWAIT_INTERVAL_PROC)
                    return_code = proc.poll()

                    if proc.stderr:
                        try:
                            line = proc.stderr.readline()
                            if line:
                                last_output = datetime.now()
                                logger.debug(f"[{camera_id}] ffmpeg output: {line.decode(errors='ignore').strip()}")
                        except Exception as e:
                            logger.exception(f"[{camera_id}] Error reading ffmpeg stderr: {e}")

                    if camera_id in self.to_close:
                        logger.info(f"[{camera_id}] Camera marked to stop. Terminating process.")
                        if return_code is None:
                            proc.terminate()
                            try:
                                proc.wait(timeout=10)
                            except subprocess.TimeoutExpired:
                                proc.kill()
                        return  # выход, т.к. нас закрыли

                    current_url = self.streams.get(camera_id)
                    if current_url != url:
                        logger.info(f"[{camera_id}] URL changed from {url} to {current_url}. Restarting ffmpeg.")
                        if return_code is None:
                            proc.terminate()
                            try:
                                proc.wait(timeout=10)
                            except subprocess.TimeoutExpired:
                                proc.kill()
                        break  # перезапуск с новым URL

                    if return_code is not None:
                        stderr_output = proc.stderr.read().decode(errors='ignore') if proc.stderr else ""
                        logger.warning(f"[{camera_id}] ffmpeg exited with code {return_code}. Stderr:\n{stderr_output}")
                        await asyncio.sleep(5)  # пауза перед рестартом
                        break  # перезапуск ffmpeg

                    # Таймаут по активности (опционально)
                    if datetime.now() - last_output > timedelta(seconds=FFMPEG_INACTIVITY_TIMEOUT):
                        logger.warning(f"[{camera_id}] No ffmpeg output for {FFMPEG_INACTIVITY_TIMEOUT}s. Restarting.")
                        if return_code is None:
                            proc.terminate()
                            try:
                                proc.wait(timeout=10)
                            except subprocess.TimeoutExpired:
                                proc.kill()
                        break  # перезапуск

            except Exception as e:
                logger.exception(f"[{camera_id}] Unexpected error in restream loop: {e}")
                await asyncio.sleep(10)  # не падаем, ждем и пробуем снова


    async def get_cmd(self, camera_id: int, camera_type: str, url: str) -> str:
        max_attempts = 40
        attempt = 0
        cmd = None

        while attempt < max_attempts:
            try:
                cmd = make_restream_cmd(camera_id, camera_type, url)

                if cmd:
                    logger.debug(cmd)
                    return cmd
                else:
                    logger.warning(f"[{camera_id}] Failed to create restream command on attempt {attempt + 1} {cmd}")
            except Exception as e:
                logger.exception(f"[{camera_id}] Exception while creating restream command: {e}")

            await asyncio.sleep(AWAIT_INTERVAL_NEW_URL)
            attempt += 1

            # Обновим URL и тип, если камера переподключилась или изменилась
            url = self.streams.get(camera_id, url)
            camera_type = self.camera_types.get(camera_id, camera_type)

        raise RuntimeError(f"[{camera_id}] Failed to generate restream command after {max_attempts} attempts")


    def restream_done(self, camera_id):
        logger.warning(f"[{camera_id}] Restream task completed or stopped.")

        # Удаляем задачу, если она всё ещё зарегистрирована
        task = self.restream_tasks.pop(camera_id, None)
        if task and not task.cancelled() and task.exception():
            logger.error(f"[{camera_id}] Restream task exited with error: {task.exception()}")

        # Удаляем камеру из списка to_close, если она там осталась
        if camera_id in self.to_close:
            self.to_close.remove(camera_id)

        # Повторно запустим задачу, если камера всё ещё в активных streams
        if camera_id in self.streams:
            logger.info(f"[{camera_id}] Restarting restream task after termination.")
            self.add_restream_task(camera_id)  
