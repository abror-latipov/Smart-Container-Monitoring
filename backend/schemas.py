from pydantic import BaseModel
import datetime

class SensorDataCreate(BaseModel):
    container_id: str
    temperature: float
    humidity: float
    lat: float
    lng: float
    vibration_level: int
    door_open: bool

class SensorData(SensorDataCreate):
    id: int
    timestamp: datetime.datetime
    class Config:
        from_attributes = True
