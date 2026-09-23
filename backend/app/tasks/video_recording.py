import subprocess
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import List, Optional


from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.camera import Camera

logger = logging.getLogger(__name__)


def record_video_from_camera(camera: Camera, duration: int, output_dir: Path) -> Optional[str]:
    """
    Records video from a camera using ffmpeg.

    Args:
        camera: Camera object from the database
        duration: Recording duration in seconds
        output_dir: Directory for saving the recording

    Returns:
        Path to the saved file or None on error
    """
    # Create the directory if it does not exist
    output_dir.mkdir(parents=True, exist_ok=True)

    # Generate the file name: camera_id_timestamp.mp4
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"camera_{camera.id}_{timestamp}.mp4"
    output_path = output_dir / filename

    # Determine ffmpeg parameters depending on the camera type
    # The camera type detection logic can be extended

    # ffmpeg command for recording
    cmd = [
        "ffmpeg",
        "-y",  # Overwrite the file if it exists
        "-rtsp_transport", "tcp",
        "-i", camera.url,
        "-t", str(duration),  # Recording duration
        "-c:v", "copy",  # Copy the video codec without re-encoding
        "-c:a", "aac",  # Audio codec
        "-f", "mp4",
        str(output_path),
    ]

    try:
        logger.info(f"Начинаю запись с камеры {camera.id} ({camera.name}) на {duration} секунд")
        logger.debug(f"Команда ffmpeg: {' '.join(cmd)}")

        # Run ffmpeg
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=duration + 30,  # Timeout with a margin
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
    Periodic task to record video from all cameras in the database.

    All cameras start recording simultaneously (in parallel),
    rather than sequentially.

    This task is launched on a schedule by APScheduler.
    """
    logger.info("Запуск задачи записи видео со всех камер (параллельное выполнение)")

    async with AsyncSessionLocal() as db:
        try:
            # Get all cameras from the database
            result = await db.execute(select(Camera))
            cameras: List[Camera] = result.scalars().all()

            if not cameras:
                logger.warning("В базе данных нет камер для записи")
                return {"status": "no_cameras", "recorded": 0}

            # Create the directory for recordings
            recording_path = Path(settings.VIDEO_RECORDING_PATH)
            recording_path.mkdir(parents=True, exist_ok=True)

            # Record video from all cameras in parallel
            recorded_count = 0
            failed_count = 0
            results = []

            # Use ThreadPoolExecutor for parallel execution
            # The maximum number of simultaneous recordings is limited by the number of cameras
            with ThreadPoolExecutor(max_workers=len(cameras)) as executor:
                # Start recording from all cameras simultaneously
                future_to_camera = {
                    executor.submit(
                        record_video_from_camera,
                        camera=camera,
                        duration=settings.VIDEO_RECORDING_DURATION,
                        output_dir=recording_path,
                    ): camera
                    for camera in cameras
                }

                # Process results as recordings complete
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
