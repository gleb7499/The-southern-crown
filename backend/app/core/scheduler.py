import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from pytz import timezone

from app.core.config import settings
from app.tasks.video_recording import record_all_cameras

logger = logging.getLogger(__name__)

# Create the scheduler
# BackgroundScheduler runs tasks in background threads,
# without blocking the main FastAPI thread
scheduler = BackgroundScheduler(timezone=timezone("Europe/Moscow"))


def parse_schedule_times(schedule_str: str) -> list:
    """Parse the schedule string into a list of times (HH:MM)"""
    return [time.strip() for time in schedule_str.split(",")]


def configure_scheduled_jobs():
    """Configure periodic tasks based on the configuration"""
    schedule_times = parse_schedule_times(settings.VIDEO_RECORDING_SCHEDULE)

    for idx, time_str in enumerate(schedule_times):
        try:
            hour, minute = map(int, time_str.split(":"))
            # BackgroundScheduler does not support async functions directly,
            # so we wrap them in a sync function that runs the async one
            import asyncio

            def run_async_task():
                """Wrapper for running an async task in a sync context"""
                try:
                    loop = asyncio.get_event_loop()
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                return loop.run_until_complete(record_all_cameras())

            scheduler.add_job(
                run_async_task,
                trigger=CronTrigger(hour=hour, minute=minute, timezone="Europe/Moscow"),
                id=f"record-videos-{idx}",
                name=f"Запись видео в {time_str}",
                replace_existing=True,
            )
            logger.info(f"Добавлена задача записи видео на {time_str} МСК")
        except ValueError as e:
            logger.error(f"Ошибка парсинга времени {time_str}: {e}")
            continue


def start_scheduler():
    """
    Start the scheduler in background mode.
    
    Tasks will run in separate threads,
    without blocking the FastAPI server.
    """
    if not scheduler.running:
        configure_scheduled_jobs()
        scheduler.start()
        logger.info("Планировщик задач запущен (выполнение в фоновых потоках)")


def shutdown_scheduler():
    """Stop the scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Планировщик задач остановлен")
