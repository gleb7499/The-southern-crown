from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Farm(Base):
    __tablename__ = "farm"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)

    control_points = relationship(
        "ControlPoint", back_populates="farm", cascade="all, delete-orphan"
    )
    growth_rates = relationship("GrowthRate", back_populates="farm", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="farm", cascade="all, delete-orphan")
