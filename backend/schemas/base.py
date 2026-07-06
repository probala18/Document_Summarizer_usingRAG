"""Base Pydantic schema with camelCase alias support for the API contract."""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class BaseSchema(BaseModel):
    """All API response/request schemas inherit from this.
    
    Configures:
    - alias_generator: auto-generates camelCase aliases from snake_case field names
    - populate_by_name: accepts both snake_case and camelCase on input
    - from_attributes: allows constructing from SQLAlchemy ORM objects
    
    And overrides model_dump / model_dump_json to default by_alias=True so that
    FastAPI's JSONResponse always serializes with camelCase keys.
    """
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    def model_dump(self, **kwargs):
        kwargs.setdefault("by_alias", True)
        return super().model_dump(**kwargs)

    def model_dump_json(self, **kwargs):
        kwargs.setdefault("by_alias", True)
        return super().model_dump_json(**kwargs)
