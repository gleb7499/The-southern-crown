from sqlalchemy import Column, ForeignKey, Index, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class ControlPoint(Base):
    __tablename__ = "control_point"

    __table_args__ = (Index("ix_control_point_farm_id", "farm_id"),)

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    frame_name = Column(String, nullable=False)
    farm_id = Column(Integer, ForeignKey("farm.id", ondelete="CASCADE"), nullable=False)

    farm = relationship("Farm", back_populates="control_points")
    cameras = relationship("Camera", back_populates="control_point", cascade="all, delete-orphan")
    growth_rates = relationship(
        "GrowthRate", back_populates="control_point", cascade="all, delete-orphan"
    )
    reports = relationship("Report", back_populates="control_point", cascade="all, delete-orphan")
