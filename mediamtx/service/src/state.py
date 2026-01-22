import asyncio
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
        # Отслеживание активных проверок потоков, чтобы избежать накопления задач
        self.active_probe_checks: Dict[int, Task[Any]] = {}

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
        logger.info(f"[{camera_id}] Starting restream loop")

        while True:
            url = self.streams.get(camera_id)
            camera_type = self.camera_types.get(camera_id)

            if not url or not camera_type:
                logger.warning(f"[{camera_id}] No URL or camera type found. Exiting restream loop.")
                return

            cmd = await self.get_cmd(camera_id, camera_type, url)
            logger.debug(f"[{camera_id}] Starting ffmpeg with command: {cmd}")

            proc = Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

            while True:
                await asyncio.sleep(AWAIT_INTERVAL_PROC)

                return_code = proc.poll()

                if camera_id in self.to_close:
                    logger.info(f"[{camera_id}] Camera marked to stop. Terminating process.")
                    if return_code is None:
                        proc.terminate()
                        try:
                            proc.wait(timeout=10)
                        except subprocess.TimeoutExpired:
                            proc.kill()
                    return

                current_url = self.streams.get(camera_id)
                if current_url != url:
                    logger.info(f"[{camera_id}] URL changed from {url} to {current_url}. Restarting process.")
                    if return_code is None:
                        proc.terminate()
                        try:
                            proc.wait(timeout=10)
                        except subprocess.TimeoutExpired:
                            proc.kill()
                    break  # Перезапуск с новым URL

                if return_code is not None:
                    # Логируем stderr для диагностики
                    stderr_output = proc.stderr.read().decode(errors='ignore') if proc.stderr else ""
                    logger.warning(f"[{camera_id}] ffmpeg exited with code {return_code}. Stderr:\n{stderr_output}")

                    # Делаем небольшую паузу, чтобы избежать частых рестартов
                    await asyncio.sleep(5)

                    break  # Перезапуск после падения
                await asyncio.sleep(5)
                # Проверяем поток только если нет активной проверки для этой камеры
                if camera_id not in self.active_probe_checks or self.active_probe_checks[camera_id].done():
                    if await self.check_stream_with_ffprobe(camera_id=camera_id) is False:
                        logger.error(f"Поток невалиден id-{camera_id}")
                        break
                else:
                    logger.debug(f"[{camera_id}] Пропуск проверки потока: предыдущая проверка еще выполняется")


    async def get_cmd(self, camera_id: int, camera_type: str, url: str) -> str:
        max_attempts = 40
        attempt = 0
        cmd = None

        while attempt < max_attempts:
            try:
                cmd = make_restream_cmd(camera_id, camera_type, url)

                if cmd:
                    return cmd
                else:
                    logger.warning(f"[{camera_id}] Failed to create restream command on attempt {attempt + 1}")
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

    async def check_stream_with_ffprobe(self, camera_id: int, timeout: int = 60) -> bool:
        """
        Проверяет доступность RTSP-потока через ffprobe с использованием tcp-транспорта.
        Возвращает True, если поток доступен, иначе False.
        
        Примечание: таймаут уменьшен до 10 секунд, чтобы избежать накопления задач
        при частых проверках (каждые 5 секунд).
        """
        stream_url = f"rtsp://localhost:8554/stream_{camera_id}"
        logger.debug(f"[{camera_id}] Начало проверки потока через ffprobe: {stream_url}")
        
        # Создаем задачу для отслеживания активной проверки
        async def _probe_task():
            cmd = [
                "ffprobe",
                "-loglevel", "error",  # или "debug" для подробностей
                "-show_streams",
                "-rtsp_transport", "tcp",
                stream_url
            ]

            try:
                logger.debug(f"[{camera_id}] Запуск ffprobe команды: {' '.join(cmd)}")
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                try:
                    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
                except asyncio.TimeoutError:
                    logger.warning(f"[{camera_id}] Таймаут при проверке потока через ffprobe (timeout={timeout}s)")
                    proc.kill()
                    await proc.wait()
                    return False

                if proc.returncode == 0:
                    output = stdout.decode() + stderr.decode()
                    logger.debug(f"[{camera_id}] ffprobe выполнен успешно, returncode=0")
                    # Можно дополнительно проверить, что в output есть данные о потоках
                    if "codec_type" in output:  # простая проверка на наличие потоков
                        logger.info(f"[{camera_id}] Поток валиден: найден codec_type в выводе ffprobe")
                        return True
                    else:
                        logger.warning(f"[{camera_id}] Поток недоступен: codec_type не найден в выводе ffprobe")
                        logger.debug(f"[{camera_id}] Вывод ffprobe: {output[:200]}...")  # Первые 200 символов для отладки
                else:
                    stderr_output = stderr.decode() if stderr else ""
                    logger.warning(f"[{camera_id}] ffprobe завершился с ошибкой, returncode={proc.returncode}")
                    logger.debug(f"[{camera_id}] Stderr ffprobe: {stderr_output[:200]}...")  # Первые 200 символов для отладки
                return False

            except Exception as e:
                logger.error(f"[{camera_id}] Исключение при проверке потока через ffprobe: {e}")
                logger.error(f"[{camera_id}] Локальный поток {stream_url} не активен")
                return False
        
        # Запускаем проверку как задачу и сохраняем ссылку
        probe_task = self.loop.create_task(_probe_task())
        self.active_probe_checks[camera_id] = probe_task
        
        try:
            result = await probe_task
            return result
        finally:
            # Удаляем задачу из отслеживания после завершения
            if camera_id in self.active_probe_checks:
                del self.active_probe_checks[camera_id]
