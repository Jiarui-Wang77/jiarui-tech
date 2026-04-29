from pydantic import BaseModel, Field


class CategoryBase(BaseModel):
    name_zh: str = Field(min_length=1, max_length=50)
    name_en: str = Field(min_length=1, max_length=50)
    slug: str = Field(min_length=1, max_length=50, pattern=r"^[a-z0-9-]+$")
    sort_order: int = 0
    is_featured: bool = False


class CategoryCreate(CategoryBase):
    pass


class CategoryPublic(CategoryBase):
    model_config = {"from_attributes": True}
    id: int
