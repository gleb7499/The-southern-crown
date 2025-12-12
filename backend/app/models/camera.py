from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    control_point_id = Column(Integer, ForeignKey("control_points.id"), nullable=False)
    
    control_point = relationship("ControlPoint", back_populates="cameras")
