from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Farm(Base):
    __tablename__ = "farms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    
    buildings = relationship("Building", back_populates="farm")


class Building(Base):
    __tablename__ = "buildings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=False)
    
    farm = relationship("Farm", back_populates="buildings")
    control_points = relationship("ControlPoint", back_populates="building")


class ControlPoint(Base):
    __tablename__ = "control_points"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    building_id = Column(Integer, ForeignKey("buildings.id"), nullable=False)
    day_of_development = Column(Integer, default=0)
    average_deviation = Column(Integer, default=0)
    
    building = relationship("Building", back_populates="control_points")
    cameras = relationship("Camera", back_populates="control_point")
