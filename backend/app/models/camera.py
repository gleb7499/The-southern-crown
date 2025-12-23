from sqlalchemy import Column, ForeignKey, Index, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Camera(Base):
    __tablename__ = "camera"

    __table_args__ = (Index("ix_camera_control_point_id", "control_point_id"),)

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    control_point_id = Column(
        Integer, ForeignKey("control_point.id", ondelete="CASCADE"), nullable=False
    )

    control_point = relationship("ControlPoint", back_populates="cameras")
