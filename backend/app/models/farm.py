from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Farm(Base):
    __tablename__ = "farms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    buildings = relationship("Building", back_populates="farm", cascade="all, delete-orphan")


class Building(Base):
    __tablename__ = "buildings"
    
    __table_args__ = (
        Index('ix_buildings_farm_id', 'farm_id'),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    farm = relationship("Farm", back_populates="buildings")
    control_points = relationship("ControlPoint", back_populates="building", cascade="all, delete-orphan")


class ControlPoint(Base):
    __tablename__ = "control_points"
    
    __table_args__ = (
        Index('ix_control_points_building_id', 'building_id'),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    building_id = Column(Integer, ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False)
    day_of_development = Column(Integer, default=0)
    average_deviation = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    building = relationship("Building", back_populates="control_points")
    cameras = relationship("Camera", back_populates="control_point", cascade="all, delete-orphan")
