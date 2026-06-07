from sqlalchemy import Boolean, Column, Float, Integer, String, DateTime
import datetime
from database import Base

class SensorData(Base):
    __tablename__ = "sensor_data"
    id = Column(Integer, primary_key=True, index=True)
    container_id = Column(String, index=True)
    temperature = Column(Float)
    humidity = Column(Float)
    lat = Column(Float)
    lng = Column(Float)
    vibration_level = Column(Integer)
    door_open = Column(Boolean)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
