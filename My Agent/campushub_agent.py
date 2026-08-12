"""Agent local CampusHubIA.

Le moteur combine un index lexical entraîné au démarrage sur le corpus
CampusHub et un contexte structuré fourni par le backend. Les faits dynamiques
restent donc dans MySQL et ne sont jamais inventés par le modèle.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
import unicodedata
from typing import Any

from response_engine import LocalResponseEngine


MODEL_NAME = "campushub-ia-local-v1"


def _text(value: Any, fallback: str = "") -> str:
    if value is None:
        return fallback
    return str(value).strip() or fallback


def _normalise(value: Any) -> str:
    text = unicodedata.normalize("NFKD", _text(value).casefold())
    return "".join(char for char in text if not unicodedata.combining(char))


def _money(item: dict[str, Any]) -> str:
    minimum = item.get("frais_minimum")
    maximum = item.get("frais_maximum")
    currency = _text(item.get("devise"), "USD")
    if minimum is None:
        return "frais à confirmer auprès de l’établissement"
    if maximum is not None and str(maximum) != str(minimum):
        return f"entre {minimum} et {maximum} {currency}"
    return f"à partir de {minimum} {currency}"


def _sources(items: list[dict[str, Any]]) -> list[dict[str, str]]:
    sources = []
    for item in items:
        code = _text(item.get("code_filiere") or item.get("code_universite"))
        label = _text(item.get("nom_filiere") or item.get("nom_universite"))
        if code and not any(source["code"] == code for source in sources):
            sources.append({"code": code, "label": label})
    return sources


@dataclass(frozen=True)
class AgentAnswer:
    response: str
    source: str
    confidence: float
    sources: list[dict[str, str]]

    def as_dict(self) -> dict[str, Any]:
        return {
            "response": self.response,
            "source": self.source,
            "confidence": round(self.confidence, 3),
            "sources": self.sources,
            "model": MODEL_NAME,
        }


class CampusHubAgent:
    """Répond avec le corpus local et les données CampusHub vérifiées."""

    def __init__(self, knowledge_path: str | Path = "data/campushub_knowledge.txt"):
        self.knowledge_path = Path(knowledge_path)
        self.engine = LocalResponseEngine(self.knowledge_path)

    def reload(self) -> None:
        self.engine.reload()

    def respond(
        self,
        message: str,
        task: str = "GENERAL",
        context: dict[str, Any] | None = None,
        audience: str = "VISITEUR",
    ) -> AgentAnswer:
        context = context or {}
        task = _text(task, "GENERAL").upper()
        if task in {"ORIENTATION", "ORIENTATION_FINALISTE"}:
            return self._orientation(message, context, finaliste=task.endswith("FINALISTE"))
        if task == "COPILOTE_INSTITUTION":
            return self._copilot(message, context)
        return self._general(message, context, audience)

    def _orientation(self, message: str, context: dict[str, Any], finaliste: bool) -> AgentAnswer:
        recommendations = list(context.get("recommandations") or [])[:5]
        profile = context.get("profil") or {}
        tracks = [str(item).strip() for item in (context.get("pistes") or []) if str(item).strip()][:8]
        if not recommendations:
            if tracks:
                option = _text(profile.get("option"), "votre option")
                percentage = _text(profile.get("pourcentage"), "votre résultat")
                track_lines = "\n".join(f"• {track}" for track in tracks)
                return AgentAnswer(
                    f"Avec une option {option} et {percentage} %, vous pouvez envisager :\n"
                    f"{track_lines}\n\n"
                    "Je ne trouve pas encore de formation supérieure active correspondant exactement "
                    "à ce profil dans les établissements vérifiés de CampusHub. Précisez votre ville, "
                    "votre budget ou le domaine qui vous attire le plus pour élargir la recherche.",
                    "live_context",
                    0.97,
                    [],
                )
            return AgentAnswer(
                "Je n’ai trouvé aucune formation suffisamment compatible dans les données "
                "CampusHub actuelles. Élargissez le domaine, le budget ou la mobilité, puis "
                "consultez directement l’annuaire des établissements vérifiés.",
                "live_context",
                0.98,
                [],
            )

        objective = _text(context.get("objectif"), message)
        intro = f"CampusHubIA a comparé votre projet « {objective} » avec les formations actives des établissements vérifiés."
        if finaliste:
            intro = (
                f"Avec une option {_text(profile.get('option'), 'indiquée')} et "
                f"{_text(profile.get('pourcentage'), '—')} %, voici les possibilités les plus cohérentes "
                "à explorer dans CampusHub."
            )

        lines = [intro]
        if tracks:
            lines.extend(["", "Domaines que vous pouvez envisager :"])
            lines.extend(f"• {track}" for track in tracks)
        lines.extend(["", "Universités et formations prioritaires :"])
        for index, item in enumerate(recommendations[:5], start=1):
            name = _text(item.get("nom_filiere"), "Formation")
            university = _text(item.get("nom_universite"), "Établissement CampusHub")
            location = ", ".join(filter(None, [_text(item.get("ville")), _text(item.get("province"))]))
            score = item.get("score_compatibilite")
            score_text = f" — compatibilité {score} %" if score is not None else ""
            lines.append(f"{index}. {name} — {university}{score_text}")
            details = [location, _money(item), _text(item.get("niveau_diplome"))]
            lines.append("   " + " · ".join(value for value in details if value))
            reasons = [str(reason) for reason in (item.get("raisons") or [])[:3] if reason]
            if reasons:
                lines.append("   Pourquoi : " + "; ".join(reasons) + ".")
            indicator = _text(item.get("indicateur_dossier"))
            if indicator:
                lines.append(f"   Indication du dossier : {indicator}.")

        lines.extend([
            "",
            "Prochaines étapes :",
            "1. Ouvrez la fiche des trois premiers établissements.",
            "2. Vérifiez les conditions d’admission, les dates et les frais officiels.",
            "3. Comparez les campus, puis envoyez votre demande depuis CampusHub.",
            "",
            "Ces recommandations aident à décider, mais l’admission reste confirmée par l’établissement.",
        ])
        return AgentAnswer("\n".join(lines), "live_context", 0.97, _sources(recommendations))

    def _copilot(self, message: str, context: dict[str, Any]) -> AgentAnswer:
        request_data = context.get("demande") or {}
        university = context.get("universite") or {}
        programs = list(context.get("filieres") or [])
        conditions = list(context.get("conditions") or [])
        campuses = list(context.get("campus") or [])
        services = list(context.get("services") or [])
        infrastructures = list(context.get("infrastructures") or [])
        selected = context.get("filiereSelectionnee") or (programs[0] if programs else None)
        work_type = _text(request_data.get("type"), "PUBLICATION").upper()
        name = _text(university.get("nom"), "Votre établissement")
        audience = _text(request_data.get("publicCible"), "la communauté académique")
        request = _text(request_data.get("demande"), message)

        if work_type == "PRESENTATION_FILIERE":
            if not selected:
                answer = "Ajoutez d’abord une filière active afin que CampusHubIA puisse la présenter."
            else:
                answer = (
                    f"{_text(selected.get('nom'), 'Formation')} — {name}\n\n"
                    f"Cette formation de niveau {_text(selected.get('niveau_diplome'), 'à préciser')} "
                    f"développe des compétences en {_text(selected.get('domaine'), 'un domaine à préciser')}. "
                    f"{('Durée indicative : ' + str(selected.get('duree_annees')) + ' an(s). ') if selected.get('duree_annees') else ''}"
                    f"Les frais sont {_money(selected)}.\n\n"
                    "Consultez la fiche CampusHub de l’établissement pour vérifier les conditions, "
                    "les dates et les campus où cette formation est organisée."
                )
        elif work_type == "ADMISSION":
            if not conditions:
                answer = (
                    f"Guide d’admission — {name}\n\nAucune condition d’admission n’est encore "
                    "enregistrée. Complétez d’abord la rubrique Admissions avant de diffuser ce guide."
                )
            else:
                checklist = "\n".join(
                    f"{index}. {_text(item.get('titre'), 'Condition')} : {_text(item.get('description'), 'à préciser')}"
                    for index, item in enumerate(conditions, start=1)
                )
                answer = (
                    f"Guide d’admission — {name}\n\nPublic : {audience}\n\n{checklist}\n\n"
                    "Avant publication, confirmez les dates, les pièces demandées et les frais auprès du service compétent."
                )
        elif work_type == "DIAGNOSTIC_FICHE":
            missing = []
            if not university.get("description"):
                missing.append("ajouter une présentation claire de l’établissement")
            if not programs:
                missing.append("enregistrer les formations actives")
            if not conditions:
                missing.append("préciser les conditions d’admission")
            if not campuses:
                missing.append("renseigner au moins un campus")
            if not services:
                missing.append("présenter les services disponibles")
            if not infrastructures:
                missing.append("documenter les infrastructures")
            priorities = "\n".join(f"{index}. {item}." for index, item in enumerate(missing[:5], start=1))
            answer = (
                f"Diagnostic de la fiche {name}\n\n"
                f"Données présentes : {len(programs)} formation(s), {len(campuses)} campus, "
                f"{len(services)} service(s), {len(conditions)} condition(s) d’admission et "
                f"{len(infrastructures)} infrastructure(s).\n\n"
                + (f"Priorités :\n{priorities}" if priorities else "La fiche contient les rubriques essentielles. Vérifiez maintenant les textes, les photos et les dates.")
            )
        else:
            website = _text(university.get("site_web"))
            city = ", ".join(filter(None, [_text(university.get("ville")), _text(university.get("province"))]))
            call_to_action = "Découvrez notre fiche vérifiée sur CampusHub"
            if website:
                call_to_action += f" et consultez {website}"
            answer = (
                f"{name} — Information destinée à {audience}\n\n{request}\n\n"
                f"{_text(university.get('description'), 'Notre établissement accompagne les apprenants dans leur parcours académique.')}\n\n"
                f"{('Retrouvez-nous à ' + city + '. ') if city else ''}{call_to_action} pour vérifier les formations, "
                "les admissions et les services disponibles.\n\n#CampusHub #Orientation #Études"
            )

        return AgentAnswer(
            answer,
            "live_context",
            0.96,
            [{"code": _text(university.get("code_universite"), "ETABLISSEMENT"), "label": name}],
        )

    def _general(self, message: str, context: dict[str, Any], audience: str) -> AgentAnswer:
        history = list(context.get("historique") or [])[-8:]
        normalised = _normalise(message)
        if re.search(r"\b(quel est mon nom|comment je m'appelle|tu connais mon nom)\b", normalised):
            for previous in reversed(history):
                if _text(previous.get("role")).upper() != "UTILISATEUR":
                    continue
                match = re.search(r"\bje m['’]?appelle\s+([\wÀ-ÿ'-]{2,40})", _text(previous.get("contenu")), re.IGNORECASE)
                if match:
                    name = match.group(1).strip().capitalize()
                    return AgentAnswer(
                        f"Vous m’avez dit que vous vous appelez {name}.",
                        "conversation_memory",
                        1.0,
                        [],
                    )
            return AgentAnswer(
                "Vous ne m’avez pas encore donné votre nom dans cette conversation.",
                "conversation_memory",
                1.0,
                [],
            )

        documents = []
        for item in context.get("documents") or []:
            if isinstance(item, dict):
                documents.append(" · ".join(f"{key}: {value}" for key, value in item.items() if value is not None))
            elif item:
                documents.append(str(item))
        response, source, confidence = self.engine.answer(message, documents)
        prefix = "" if source != "fallback" else f"Pour votre espace {audience.lower()}, "
        return AgentAnswer(prefix + response, source, confidence, [])
