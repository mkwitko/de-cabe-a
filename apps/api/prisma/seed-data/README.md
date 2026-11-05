# Seed data

`clubs.json`: `[wikidataId, name, shortName, isoCode, foundedYear]`. QIDs, names, country and inception come from Wikidata (CC0), fetched 2026-11-05 with `wbsearchentities` + `wbgetentities` and checked by hand (each item is an association football club). `shortName` is editorial (common name in PT-BR). Clubs are seeded as `imported`; an editor verifies them in the admin panel.

Countries come from the ISO 3166-1 alpha-2 list in `../seed.ts`, named with `Intl.DisplayNames('pt-BR')`. England, Scotland, Wales and Northern Ireland are not ISO countries: nationality for those players is open until the import slice (see `docs/DATA_MODEL.md` §5).
