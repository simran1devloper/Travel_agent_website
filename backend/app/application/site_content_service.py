from __future__ import annotations
from typing import Any
from ..adapters.outbound.sqlite.repositories.site_content import SQLiteSiteContentRepository


class SiteContentService:
    def __init__(self, repo: SQLiteSiteContentRepository) -> None:
        self._repo = repo

    def get_page(self, page: str) -> dict[str, Any]:
        """Returns nested {section: {key: value}} dict for one page."""
        rows = self._repo.get_page(page)
        result: dict[str, Any] = {}
        for row in rows:
            s = row["section"]
            k = row["key"]
            if s not in result:
                result[s] = {}
            result[s][k] = row["value"]
        return result

    def get_all(self) -> dict[str, Any]:
        """Returns {page: {section: {key: value}}} for the admin panel."""
        rows = self._repo.get_all()
        result: dict[str, Any] = {}
        for row in rows:
            p, s, k = row["page"], row["section"], row["key"]
            if p not in result:
                result[p] = {}
            if s not in result[p]:
                result[p][s] = {}
            result[p][s][k] = {
                "value": row["value"],
                "label": row["label"],
                "value_type": row["value_type"],
                "sort_order": row["sort_order"],
            }
        return result

    def bulk_update(self, updates: list[dict[str, str]]) -> dict[str, Any]:
        count = self._repo.bulk_upsert(updates)
        return {"updated": count}
