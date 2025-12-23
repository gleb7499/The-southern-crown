from sqlalchemy import Column, Date, ForeignKey, Index, Integer
from sqlalchemy.orm import relationship

from app.core.database import Base


class GrowthRate(Base):
    __tablename__ = "growth_rate"

    __table_args__ = (
        Index("ix_growth_rate_farm_id", "farm_id"),
        Index("ix_growth_rate_control_point_id", "control_point_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farm.id", ondelete="CASCADE"), nullable=False)
    control_point_id = Column(
        Integer, ForeignKey("control_point.id", ondelete="CASCADE"), nullable=False
    )
    chickens_quantity = Column(Integer, nullable=False)
    growth_day = Column(Integer, nullable=False)
    initial_average_weight = Column(Integer, nullable=False)
    closing_date = Column(Date, nullable=True)
    landing_date = Column(Date, nullable=False)

    farm = relationship("Farm", back_populates="growth_rates")
    control_point = relationship("ControlPoint", back_populates="growth_rates")
