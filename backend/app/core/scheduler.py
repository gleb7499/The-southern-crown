import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from pytz import timezone

from app.core.config import settings
from app.tasks.video_recording import record_all_cameras

logger = logging.getLogger(__name__)

# Создаем планировщик
# BackgroundScheduler выполняет задачи в фоновых потоках,
# не блокируя основной поток FastAPI
scheduler = BackgroundScheduler(timezone=timezone("Europe/Moscow"))


def parse_schedule_times(schedule_str: str) -> list:
    """Парсит строку расписания в список времени (HH:MM)"""
    return [time.strip() for time in schedule_str.split(",")]


def configure_scheduled_jobs():
    """Настраивает периодические задачи на основе конфигурации"""
    schedule_times = parse_schedule_times(settings.VIDEO_RECORDING_SCHEDULE)

    for idx, time_str in enumerate(schedule_times):
        try:
            hour, minute = map(int, time_str.split(":"))
            # BackgroundScheduler не поддерживает async функции напрямую,
            # поэтому оборачиваем в sync функцию, которая запускает async
            import asyncio

            def run_async_task():
                """Обертка для запуска async задачи в синхронном контексте"""
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
    Запускает планировщик в фоновом режиме.
    
    Задачи будут выполняться в отдельных потоках,
    не блокируя работу FastAPI сервера.
    """
    if not scheduler.running:
        configure_scheduled_jobs()
        scheduler.start()
        logger.info("Планировщик задач запущен (выполнение в фоновых потоках)")


def shutdown_scheduler():
    """Останавливает планировщик"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Планировщик задач остановлен")
