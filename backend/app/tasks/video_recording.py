import subprocess
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.camera import Camera

logger = logging.getLogger(__name__)


def record_video_from_camera(camera: Camera, duration: int, output_dir: Path) -> Optional[str]:
    """
    Записывает видео с камеры используя ffmpeg.

    Args:
        camera: Объект камеры из БД
        duration: Длительность записи в секундах
        output_dir: Директория для сохранения записи

    Returns:
        Путь к сохраненному файлу или None в случае ошибки
    """
    # Создаем директорию если её нет
    output_dir.mkdir(parents=True, exist_ok=True)

    # Генерируем имя файла: camera_id_timestamp.mp4
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"camera_{camera.id}_{timestamp}.mp4"
    output_path = output_dir / filename

    # Определяем параметры для ffmpeg в зависимости от типа камеры
    # Можно расширить логику определения типа камеры
    input_prefix = "-rtsp_transport tcp"
    
    # Команда ffmpeg для записи
    cmd = [
        "ffmpeg",
        "-y",  # Перезаписать файл если существует
        "-rtsp_transport", "tcp",
        "-i", camera.url,
        "-t", str(duration),  # Длительность записи
        "-c:v", "copy",  # Копировать видео кодек без перекодирования
        "-c:a", "aac",  # Аудио кодек
        "-f", "mp4",
        str(output_path),
    ]

    try:
        logger.info(f"Начинаю запись с камеры {camera.id} ({camera.name}) на {duration} секунд")
        logger.debug(f"Команда ffmpeg: {' '.join(cmd)}")

        # Запускаем ffmpeg
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=duration + 30,  # Таймаут с запасом
        )

        if result.returncode == 0:
            logger.info(f"Запись успешно завершена: {output_path}")
            return str(output_path)
        else:
            error_msg = result.stderr.decode("utf-8", errors="ignore")
            logger.error(f"Ошибка записи с камеры {camera.id}: {error_msg}")
            return None

    except subprocess.TimeoutExpired:
        logger.error(f"Таймаут при записи с камеры {camera.id}")
        return None
    except Exception as e:
        logger.error(f"Исключение при записи с камеры {camera.id}: {str(e)}")
        return None


async def record_all_cameras():
    """
    Периодическая задача для записи видео со всех камер из БД.
    
    Все камеры начинают запись одновременно (параллельно),
    а не последовательно.

    Эта задача запускается по расписанию из APScheduler.
    """
    logger.info("Запуск задачи записи видео со всех камер (параллельное выполнение)")
    
    async with AsyncSessionLocal() as db:
        try:
            # Получаем все камеры из БД
            result = await db.execute(select(Camera))
            cameras: List[Camera] = result.scalars().all()
            
            if not cameras:
                logger.warning("В базе данных нет камер для записи")
                return {"status": "no_cameras", "recorded": 0}

            # Создаем директорию для записей
            recording_path = Path(settings.VIDEO_RECORDING_PATH)
            recording_path.mkdir(parents=True, exist_ok=True)

            # Записываем видео со всех камер параллельно
            recorded_count = 0
            failed_count = 0
            results = []

            # Используем ThreadPoolExecutor для параллельного выполнения
            # Максимальное количество одновременных записей ограничено количеством камер
            with ThreadPoolExecutor(max_workers=len(cameras)) as executor:
                # Запускаем запись со всех камер одновременно
                future_to_camera = {
                    executor.submit(
                        record_video_from_camera,
                        camera=camera,
                        duration=settings.VIDEO_RECORDING_DURATION,
                        output_dir=recording_path,
                    ): camera
                    for camera in cameras
                }

                # Обрабатываем результаты по мере завершения записей
                for future in as_completed(future_to_camera):
                    camera = future_to_camera[future]
                    try:
                        output_path = future.result()
                        
                        if output_path:
                            recorded_count += 1
                            results.append({
                                "camera_id": camera.id,
                                "camera_name": camera.name,
                                "output_path": output_path,
                                "status": "success",
                            })
                        else:
                            failed_count += 1
                            results.append({
                                "camera_id": camera.id,
                                "camera_name": camera.name,
                                "status": "failed",
                            })
                    except Exception as e:
                        logger.error(f"Ошибка при записи с камеры {camera.id}: {str(e)}")
                        failed_count += 1
                        results.append({
                            "camera_id": camera.id,
                            "camera_name": camera.name,
                            "status": "error",
                            "error": str(e),
                        })

            logger.info(
                f"Задача записи завершена: успешно {recorded_count}, "
                f"ошибок {failed_count}, всего камер {len(cameras)}"
            )

            return {
                "status": "completed",
                "total_cameras": len(cameras),
                "recorded": recorded_count,
                "failed": failed_count,
                "results": results,
            }

        except Exception as e:
            logger.error(f"Критическая ошибка в задаче записи видео: {str(e)}")
            return {"status": "error", "error": str(e)}
