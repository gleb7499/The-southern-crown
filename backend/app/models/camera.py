from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Camera(Base):
    __tablename__ = "cameras"
    
    __table_args__ = (
        Index('ix_cameras_control_point_id', 'control_point_id'),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    control_point_id = Column(Integer, ForeignKey("control_points.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    control_point = relationship("ControlPoint", back_populates="cameras")
