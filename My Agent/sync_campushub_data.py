"""Construit le corpus public de CampusHubIA depuis l’API CampusHub."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


BASE_DIR = Path(__file__).resolve().parent


def get_json(url: str) -> dict:
    request = Request(url, headers={"User-Agent": "CampusHubIA-DataSync/1.0"})
    with urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_institutions(api_url: str) -> list[dict]:
    page = 1
    institutions = []
    while True:
        query = urlencode({"statut": "VERIFIEE", "page": page, "limite": 100})
        payload = get_json(f"{api_url.rstrip('/')}/universites?{query}")
        institutions.extend(payload.get("donnees") or [])
        meta = payload.get("meta") or {}
        if page >= int(meta.get("totalPages") or 1):
            break
        page += 1
    return institutions


def build_corpus(api_url: str, seed_path: Path, qa_path: Path | None = None) -> tuple[str, list[dict]]:
    institutions = fetch_institutions(api_url)
    sections = []
    for source in (seed_path, qa_path):
        if source and source.exists():
            sections.append(source.read_text(encoding="utf-8").strip())
    catalogue = []
    for summary in institutions:
        code = summary.get("code_universite")
        if not code:
            continue
        detail = (get_json(f"{api_url.rstrip('/')}/universites/{code}").get("donnees") or {})
        catalogue.append(detail)
        name = detail.get("nom") or summary.get("nom") or code
        city = detail.get("ville") or "ville non précisée"
        province = detail.get("province") or "province non précisée"
        category = detail.get("categorie_etablissement") or "ETABLISSEMENT"
        description = detail.get("description") or "Description à compléter sur CampusHub."
        sections.append(
            f"Q: Que faut-il savoir sur {name} ?\n"
            f"R: {name} est un établissement vérifié sur CampusHub, de catégorie {category}, "
            f"situé à {city}, {province}. {description} Code CampusHub : {code}."
        )
        programs = detail.get("filieres") or []
        if programs:
            names = ", ".join((item.get("nom_filiere") or item.get("nom") or "Formation") for item in programs[:20])
            sections.append(f"Q: Quelles formations propose {name} ?\nR: Les formations actives enregistrées sont : {names}.")
        for program in programs:
            program_name = program.get("nom_filiere") or program.get("nom") or "Formation"
            fees = "frais à confirmer"
            if program.get("frais_minimum") is not None:
                fees = f"à partir de {program['frais_minimum']} {program.get('devise') or 'USD'}"
            sections.append(
                f"Q: Où étudier {program_name} ?\nR: {program_name} est proposé par {name} "
                f"à {city}. Niveau : {program.get('niveau_diplome') or 'à préciser'}. "
                f"Domaine : {program.get('domaine') or 'à préciser'}. Frais : {fees}. "
                f"Code formation : {program.get('code_filiere') or 'non précisé'}."
            )
        conditions = detail.get("conditions") or []
        if conditions:
            text = "; ".join(f"{item.get('titre')}: {item.get('description')}" for item in conditions[:15])
            sections.append(f"Q: Quelles sont les conditions d’admission de {name} ?\nR: {text}")
    return "\n\n".join(section for section in sections if section).strip() + "\n", catalogue


def main() -> None:
    parser = argparse.ArgumentParser(description="Synchronise le corpus public CampusHubIA")
    parser.add_argument("--api-url", default="http://127.0.0.1:4000/api/v1")
    parser.add_argument("--output", default=str(BASE_DIR / "data" / "campushub_knowledge.txt"))
    parser.add_argument("--catalogue", default=str(BASE_DIR / "data" / "campushub_catalogue.json"))
    parser.add_argument("--seed", default=str(BASE_DIR / "data" / "campushub_seed.txt"))
    parser.add_argument("--qa", default=str(BASE_DIR / "data" / "campushub_qa_8000.txt"))
    args = parser.parse_args()

    output = Path(args.output)
    catalogue_path = Path(args.catalogue)
    corpus, catalogue = build_corpus(args.api_url, Path(args.seed), Path(args.qa))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(corpus, encoding="utf-8")
    catalogue_path.write_text(json.dumps({
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": args.api_url,
        "institutions": catalogue,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"CampusHubIA : {len(catalogue)} établissement(s), {len(corpus)} caractères synchronisés.")


if __name__ == "__main__":
    main()
