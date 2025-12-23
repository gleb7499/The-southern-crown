from sqlalchemy import Column, Integer, ForeignKey, Date, Index
from sqlalchemy.orm import relationship
from app.core.database import Base


class Report(Base):
    __tablename__ = "report"
    
    __table_args__ = (
        Index('ix_report_farm_id', 'farm_id'),
        Index('ix_report_control_point_id', 'control_point_id'),
    )

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farm.id", ondelete="CASCADE"), nullable=False)
    control_point_id = Column(Integer, ForeignKey("control_point.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    gram = Column(Integer, nullable=False)
    
    farm = relationship("Farm", back_populates="reports")
    control_point = relationship("ControlPoint", back_populates="reports")
