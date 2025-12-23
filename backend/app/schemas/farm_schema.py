from pydantic import BaseModel


class FarmBase(BaseModel):
    name: str


class FarmCreate(FarmBase):
    pass


class Farm(FarmBase):
    id: int

    class Config:
        from_attributes = True
